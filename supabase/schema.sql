-- Footnote (行迹) — Supabase schema for the multi-user version.
-- Mirrors src/lib/types.ts (product plan, section 7). The prototype keeps the
-- same model in the browser; this is what replaces it when the app moves to
-- Supabase.
--
-- Conventions:
--   * Every row records its creator and time, so changes can be traced.
--   * Times of day are minutes since midnight in the destination's time zone,
--     dates are plain dates, so trips across time zones never shift.
--   * Row-level security follows trip membership: non-members can read nothing.
--   * Ticket and photo files live in private storage buckets, served through
--     expiring signed URLs.

create extension if not exists "pgcrypto";

create type pace as enum ('relaxed', 'moderate', 'packed');
create type member_role as enum ('organizer', 'member', 'viewer');
create type place_category as enum ('sight', 'restaurant', 'cafe', 'shopping', 'other');
create type place_status as enum ('want', 'scheduled', 'visited', 'dropped');
create type ticket_status as enum ('pending', 'confirmed');
create type change_reason as enum ('ticket', 'manual', 'conflict');
create type visibility as enum ('private', 'group');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  arrival_time smallint not null check (arrival_time between 0 and 1439),
  departure_time smallint not null check (departure_time between 0 and 1439),
  group_size smallint not null default 1,
  hotel_name text not null default '',
  hotel_lat double precision,
  hotel_lng double precision,
  pace pace not null default 'moderate',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  time_zone text not null,
  album_theme text not null default 'film',
  album_generated_at timestamptz,
  ai_daily_limit integer not null default 200,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

create table members (
  trip_id uuid not null references trips on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  name text not null,
  lat double precision,
  lng double precision,
  category place_category not null default 'other',
  status place_status not null default 'want',
  note text,
  added_by uuid not null references profiles,
  created_at timestamptz not null default now()
);
create index on places (trip_id);

-- One like per person per place, and it can be taken back.
create table place_likes (
  place_id uuid not null references places on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

-- Only links users share themselves, with public share metadata. No scraping.
create table sources (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places on delete cascade,
  platform text not null,
  url text not null,
  title text,
  thumbnail_url text,
  reason text,
  added_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  unique (place_id, url)
);

create table itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  date date not null,
  title text not null,
  place_id uuid references places on delete set null,
  start_min smallint not null check (start_min between 0 and 1439),
  duration_min smallint not null check (duration_min > 0),
  fixed boolean not null default false,
  fixed_reason text check (fixed_reason in ('ticket', 'manual')),
  original_start_min smallint,
  kind text not null default 'activity' check (kind in ('activity', 'marker')),
  checked_in boolean not null default false,
  ai_generated boolean not null default false,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);
create index on itinerary_items (trip_id, date, start_min);

-- Deleting an item leaves its tickets and photos "unmatched" (set null).
create table tickets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  file_path text,                 -- path in the private "tickets" bucket
  file_sha256 text,               -- the same image is only read by AI once
  name text not null default '',
  date date,
  time_min smallint,
  end_time_min smallint,
  headcount text,
  order_number text,
  status ticket_status not null default 'pending',
  item_id uuid references itinerary_items on delete set null,
  uploaded_by uuid not null references profiles,
  created_at timestamptz not null default now()
);
create index on tickets (trip_id);

create table photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  file_path text not null,        -- compressed copy, private "photos" bucket
  original_path text,             -- original, kept by default
  item_id uuid references itinerary_items on delete set null,
  taken_at timestamptz not null,
  note text,
  hidden boolean not null default false,
  uploaded_by uuid not null references profiles,
  created_at timestamptz not null default now()
);
create index on photos (trip_id, item_id);

-- Every automatic adjustment and member edit, with what it replaced, for undo.
create table change_log (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  summary_en text not null,
  summary_zh text not null,
  reason change_reason not null,
  before jsonb not null,
  after jsonb not null,
  undone boolean not null default false,
  by uuid not null references profiles,
  at timestamptz not null default now()
);
create index on change_log (trip_id, at desc);

-- Quick notes keep the original words, always.
create table quick_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  text text not null,
  kind text not null,
  target_id uuid,
  visibility visibility not null default 'private',
  undone boolean not null default false,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  text text not null,
  done boolean not null default false,
  assignee uuid references profiles,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  text text not null,
  at timestamptz,
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

-- Phase 2: expense log and splitting. Amounts read by AI start as pending.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  payer uuid not null references profiles,
  participants uuid[] not null,
  category text,
  date date not null,
  item_id uuid references itinerary_items on delete set null,
  shared boolean not null default true,
  status ticket_status not null default 'confirmed',
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

-- Users' own AI keys (after phase 1). Stored encrypted; never logged.
create table user_ai_keys (
  user_id uuid primary key references profiles on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai')),
  encrypted_key bytea not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ security

create or replace function is_member(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where trip_id = t and user_id = auth.uid());
$$;

create or replace function is_editor(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where trip_id = t and user_id = auth.uid() and role in ('organizer', 'member'));
$$;

create or replace function is_organizer(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where trip_id = t and user_id = auth.uid() and role = 'organizer');
$$;

-- Joining is the only way in: look the trip up by invite code.
create or replace function join_trip(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from trips where invite_code = upper(code);
  if t is null then return null; end if;
  insert into members (trip_id, user_id) values (t, auth.uid()) on conflict do nothing;
  return t;
end;
$$;

alter table profiles enable row level security;
alter table trips enable row level security;
alter table members enable row level security;
alter table places enable row level security;
alter table place_likes enable row level security;
alter table sources enable row level security;
alter table itinerary_items enable row level security;
alter table tickets enable row level security;
alter table photos enable row level security;
alter table change_log enable row level security;
alter table quick_notes enable row level security;
alter table todos enable row level security;
alter table reminders enable row level security;
alter table expenses enable row level security;
alter table user_ai_keys enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "co-members' profiles" on profiles for select using (
  exists (select 1 from members a join members b on a.trip_id = b.trip_id where a.user_id = auth.uid() and b.user_id = profiles.id)
);

create policy "members read trip" on trips for select using (is_member(id));
create policy "anyone signed in creates a trip" on trips for insert with check (created_by = auth.uid());
create policy "organizer edits trip" on trips for update using (is_organizer(id));

create policy "members read members" on members for select using (is_member(trip_id));
create policy "creator becomes organizer" on members for insert with check (
  user_id = auth.uid() and exists (select 1 from trips where id = trip_id and created_by = auth.uid())
);
create policy "organizer manages members" on members for all using (is_organizer(trip_id));

-- Trip content: members read, organizers and members write.
do $$
declare t text;
begin
  foreach t in array array['places', 'itinerary_items', 'tickets', 'photos', 'change_log', 'todos'] loop
    execute format('create policy "members read" on %I for select using (is_member(trip_id))', t);
    execute format('create policy "editors write" on %I for all using (is_editor(trip_id)) with check (is_editor(trip_id))', t);
  end loop;
end $$;

create policy "members read" on place_likes for select using (is_member((select trip_id from places where id = place_id)));
create policy "own like" on place_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read" on sources for select using (is_member((select trip_id from places where id = place_id)));
create policy "editors write" on sources for all using (is_editor((select trip_id from places where id = place_id)));

-- Personal notes and reminders are visible only to their author by default.
create policy "visible notes" on quick_notes for select using (
  is_member(trip_id) and (visibility = 'group' or created_by = auth.uid())
);
create policy "own notes" on quick_notes for all using (created_by = auth.uid()) with check (created_by = auth.uid() and is_editor(trip_id));
create policy "own reminders" on reminders for all using (created_by = auth.uid()) with check (created_by = auth.uid() and is_member(trip_id));

-- Only travel companions see expenses; "not shared" ones only their author.
create policy "visible expenses" on expenses for select using (is_member(trip_id) and (shared or created_by = auth.uid()));
create policy "editors write" on expenses for all using (is_editor(trip_id)) with check (is_editor(trip_id));

create policy "own key" on user_ai_keys for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: private buckets; object paths start with the trip id.
insert into storage.buckets (id, name, public) values ('tickets', 'tickets', false), ('photos', 'photos', false)
on conflict do nothing;

create policy "members read trip files" on storage.objects for select using (
  bucket_id in ('tickets', 'photos') and is_member((storage.foldername(name))[1]::uuid)
);
create policy "editors upload trip files" on storage.objects for insert with check (
  bucket_id in ('tickets', 'photos') and is_editor((storage.foldername(name))[1]::uuid)
);
