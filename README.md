# Footnote · 行迹

A shared travel workspace for a group of friends. With AI drafting every step,
the group plans together, keeps every ticket in one place, checks in on site
and jots down ideas as they come. When the trip ends, the plan turns into a
photo album.

The full product plan is in [`docs/product-plan.md`](docs/product-plan.md).

## What's here

This is the **clickable prototype** the plan recommends building first
(section 12). It covers the three core experiences to validate (the itinerary
timeline, ticket-driven time changes, and the album) plus the rest of the
phase 1 scope. It runs entirely in the browser: no accounts, servers or API
keys are needed, and a demo trip ("Paris in April", invite code `PARIS5`)
loads on first open.

| Plan section | Feature | Where |
| --- | --- | --- |
| 4.1 | AI itinerary skeleton from destination, dates, arrival/departure, pace and must-sees | `src/lib/skeleton.ts`, `/trips/new` |
| 4.2 | Place pool: paste a link (小红书, Instagram, TikTok, YouTube, Google Maps, any page), likes, statuses, merged sources | `/trips/[id]/places` |
| 4.3 | Nearby suggestions from the group pool (300 m / 500 m / 1 km), "Add to today", gap hints on the timeline | `src/lib/geo.ts`, item page |
| 4.4 | Ticket center: multi-upload, "pending" until confirmed, matched to items, full-screen viewer with screen wake lock, works offline | `/trips/[id]/tickets` |
| 4.5, 5 | Ticket-driven changes: the ticketed item becomes a fixed anchor, the rest of the day moves around it, conflicts prompt *change time / move to another day / keep*, every change is undoable | `src/lib/schedule.ts`, `src/lib/state.ts` |
| 4.6 | Check-in ("I'm here") and photos on every item; compressed copy plus original kept | `src/components/PhotoButton.tsx` |
| 4.7, 4.9 | Automatic album: cover, a chapter per day, a page per place, stats; user-chosen theme with an AI suggestion from photo colors; print or save as PDF | `/trips/[id]/album` |
| 4.8 | "Note this" quick notes: typed or spoken; notes, to-dos, reminders save at once with undo; new places, itinerary changes and expenses preview first; questions are answered only from trip data | `src/components/QuickNote.tsx`, `src/lib/ai/notes.ts` |
| 3.1 | "AI generated" labels that disappear on edit; every step works without AI | throughout |
| 12 | Bilingual interface (English / 中文) | `src/lib/i18n.ts` |

### Design rules in the code

- **A ticket is a fact, a plan is an intention.** `proposeAnchor` never moves
  a fixed item; collisions come back as conflicts for the user to resolve.
- **AI proposes, rules validate.** `src/lib/schedule.ts` is plain rule code
  with tests, and is the validator any future AI proposal must pass.
- **One AI interface.** Business code talks only to `AIProvider`
  (`src/lib/ai/index.ts`). The prototype ships `localProvider`, which sorts
  notes with bilingual rules and reads ticket fields from file names such as
  `Louvre_2027-04-13_1000.pdf`. A model-backed provider (developer key with a
  daily limit, then users' own keys) plugs in with `setAI` and needs no other
  changes.

## Run it

Requires Node 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000 (on a phone, use your computer's local IP).

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build && npm start
```

The production build registers a service worker so the app can be added to
the home screen and pages open offline. Trip data is stored in
`localStorage` and files (tickets, photos) in IndexedDB on the device.
"Reset demo data" on the home screen starts over.

## Project layout

```
docs/product-plan.md     the product plan
src/lib/                 domain logic, no React
  types.ts               data model (plan section 7)
  schedule.ts            ticket-driven rescheduling and validation rules
  skeleton.ts            itinerary skeleton generator
  state.ts               all operations on trip state, with change log + undo
  ai/                    AI interface and the offline rule-based provider
  geo.ts, links.ts, time.ts, i18n.ts, files.ts, seed.ts
  store.tsx              React store (localStorage persistence)
src/app/                 Next.js pages (mobile first, five tabs)
src/components/          shared UI
supabase/schema.sql      Postgres schema with row-level security for the multi-user version
public/                  PWA manifest, icon, service worker
```

## Next steps toward the real MVP

1. **Supabase.** Apply `supabase/schema.sql` (it has not been run against a
   database yet), add magic-link / Apple / Google sign-in, and swap
   `store.tsx` persistence for Supabase queries and realtime. The operations
   in `state.ts` map one-to-one onto the tables.
2. **Model-backed AI.** Add a server route that implements `AIProvider` with a
   multimodal model for ticket reading and a small model with tool calls for
   quick notes, restricted to the whitelisted actions in `state.ts`
   (add note, add to-do, add place, propose itinerary change). Add a per-trip
   daily call limit and cache results by image hash.
3. **Maps.** Replace the OpenStreetMap embed and manual coordinates with
   Mapbox or Google Maps place search.

Still open from the plan: the AI budget per trip, the name check for
"Footnote", and who draws the memory-space scenes (phase 3).
