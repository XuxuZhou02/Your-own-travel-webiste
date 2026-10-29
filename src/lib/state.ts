// App state and the operations on it. Operations mutate a draft copy of the
// state (the React store clones before calling them), so they stay plain
// functions that can be tested without a browser.
//
// Every itinerary change goes through `commit`, which records it in the
// change log so it can be undone in one tap (design principle 2).

import { classifyNote, type NoteClassification } from "./ai/notes";
import { detectPlatform, normalizeUrl } from "./links";
import { findSlot, proposeAnchor, sortByStart, validateDay, type Proposal } from "./schedule";
import { generateSkeleton } from "./skeleton";
import { addDays, dateRange, formatTime } from "./time";
import type {
  Bilingual,
  ChangeLogEntry,
  ChangeReason,
  ItineraryItem,
  Lang,
  LatLng,
  Member,
  Pace,
  Photo,
  Place,
  PlaceCategory,
  QuickNote,
  Reminder,
  Source,
  Ticket,
  Todo,
  Trip,
  User,
} from "./types";

export interface State {
  version: 1;
  lang: Lang;
  me: string;
  users: User[];
  trips: Trip[];
  members: Member[];
  places: Place[];
  sources: Source[];
  items: ItineraryItem[];
  tickets: Ticket[];
  photos: Photo[];
  changeLog: ChangeLogEntry[];
  notes: QuickNote[];
  todos: Todo[];
  reminders: Reminder[];
}

export const uid = (prefix = "") =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const bi = (en: string, zh: string): Bilingual => ({ en, zh });

export function dayItems(s: State, tripId: string, date: string): ItineraryItem[] {
  return sortByStart(s.items.filter((i) => i.tripId === tripId && i.date === date));
}

// ---------------------------------------------------------------- change log

/** Replaces or inserts `after` items, removes `removedIds`, and logs it. */
export function commit(
  s: State,
  tripId: string,
  after: ItineraryItem[],
  summary: Bilingual,
  reason: ChangeReason,
  removedIds: string[] = [],
): ChangeLogEntry {
  const touched = new Set([...after.map((i) => i.id), ...removedIds]);
  const before = s.items.filter((i) => touched.has(i.id)).map((i) => ({ ...i }));
  s.items = [...s.items.filter((i) => !touched.has(i.id)), ...after.map((i) => ({ ...i }))];
  const entry: ChangeLogEntry = {
    id: uid("c"),
    tripId,
    summary,
    reason,
    before,
    after: after.map((i) => ({ ...i })),
    undone: false,
    by: s.me,
    at: now(),
  };
  s.changeLog.unshift(entry);
  return entry;
}

export function undoChange(s: State, entryId: string): void {
  const entry = s.changeLog.find((e) => e.id === entryId);
  if (!entry || entry.undone) return;
  const touched = new Set([...entry.before, ...entry.after].map((i) => i.id));
  s.items = [...s.items.filter((i) => !touched.has(i.id)), ...entry.before.map((i) => ({ ...i }))];
  entry.undone = true;
}

// ---------------------------------------------------------------------- trips

export interface NewTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  arrivalTime: number;
  departureTime: number;
  groupSize: number;
  hotelName: string;
  hotel?: LatLng;
  pace: Pace;
  mustSee: string[];
}

export function createTrip(s: State, input: NewTripInput): string {
  const tripId = uid("trip-");
  const createdAt = now();
  s.trips.push({
    id: tripId,
    ...input,
    inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    timeZone: "local",
    albumTheme: "film",
    createdBy: s.me,
    createdAt,
  });
  s.members.push({ tripId, userId: s.me, role: "organizer", joinedAt: createdAt });

  const mustSee = input.mustSee.map((name) => {
    const p: Place = {
      id: uid("p-"),
      tripId,
      name,
      category: "sight",
      status: "scheduled",
      likes: [s.me],
      addedBy: s.me,
      createdAt,
    };
    s.places.push(p);
    return { name, placeId: p.id };
  });

  s.items.push(
    ...generateSkeleton({
      tripId,
      startDate: input.startDate,
      endDate: input.endDate,
      arrivalTime: input.arrivalTime,
      departureTime: input.departureTime,
      pace: input.pace,
      hotel: input.hotel,
      mustSee,
      createdBy: s.me,
      lang: s.lang,
      now: createdAt,
      newId: () => uid("i"),
    }),
  );
  return tripId;
}

export function regenerateSkeleton(s: State, tripId: string): void {
  const trip = s.trips.find((t) => t.id === tripId)!;
  const drafts = s.items.filter((i) => i.tripId === tripId && i.aiGenerated && !i.fixed && !i.checkedIn);
  const kept = s.items.filter((i) => i.tripId === tripId && !drafts.includes(i));
  const mustSee = s.places
    .filter((p) => p.tripId === tripId && p.status === "scheduled" && !kept.some((i) => i.placeId === p.id))
    .map((p) => ({ name: p.name, placeId: p.id, location: p.location }));
  const fresh = generateSkeleton({
    tripId,
    startDate: trip.startDate,
    endDate: trip.endDate,
    arrivalTime: trip.arrivalTime,
    departureTime: trip.departureTime,
    pace: trip.pace,
    hotel: trip.hotel,
    mustSee,
    createdBy: s.me,
    lang: s.lang,
    now: now(),
    newId: () => uid("i"),
  }).filter((i) => i.kind === "activity" && validateDay([...kept.filter((k) => k.date === i.date), i]).length === 0);
  commit(s, tripId, fresh, bi("Regenerated the draft itinerary", "重新生成了行程草稿"), "manual", drafts.map((d) => d.id));
}

export function joinTrip(s: State, code: string, name?: string): string | null {
  const trip = s.trips.find((t) => t.inviteCode.toUpperCase() === code.trim().toUpperCase());
  if (!trip) return null;
  if (name) {
    const me = s.users.find((u) => u.id === s.me);
    if (me) me.name = name;
  }
  if (!s.members.some((m) => m.tripId === trip.id && m.userId === s.me)) {
    s.members.push({ tripId: trip.id, userId: s.me, role: "member", joinedAt: now() });
  }
  return trip.id;
}

// --------------------------------------------------------------------- places

export interface NewPlaceInput {
  name: string;
  category: PlaceCategory;
  location?: LatLng;
  link?: string;
  reason?: string;
}

/**
 * Adds a place to the pool. If the same place is already there, the new link
 * is merged into the existing card instead (section 4.2).
 */
export function addPlace(s: State, tripId: string, input: NewPlaceInput): { placeId: string; merged: boolean } {
  const key = input.name.trim().toLowerCase();
  let place = s.places.find((p) => p.tripId === tripId && p.name.trim().toLowerCase() === key);
  const merged = !!place;
  if (!place) {
    place = {
      id: uid("p-"),
      tripId,
      name: input.name.trim(),
      location: input.location,
      category: input.category,
      status: "want",
      likes: [s.me],
      addedBy: s.me,
      createdAt: now(),
    };
    s.places.push(place);
  } else if (!place.location && input.location) {
    place.location = input.location;
  }
  const url = input.link ? normalizeUrl(input.link) : null;
  if (url && !s.sources.some((src) => src.placeId === place!.id && src.url === url)) {
    s.sources.push({
      id: uid("s"),
      placeId: place.id,
      platform: detectPlatform(url),
      url,
      reason: input.reason,
      addedBy: s.me,
      createdAt: now(),
    });
  } else if (!url && input.reason && !merged) {
    place.note = input.reason;
  }
  return { placeId: place.id, merged };
}

export function toggleLike(s: State, placeId: string): void {
  const p = s.places.find((x) => x.id === placeId);
  if (!p) return;
  p.likes = p.likes.includes(s.me) ? p.likes.filter((u) => u !== s.me) : [...p.likes, s.me];
}

export function setPlaceStatus(s: State, placeId: string, status: Place["status"]): void {
  const p = s.places.find((x) => x.id === placeId);
  if (p) p.status = status;
}

/** Puts a pool place into the first free slot of a day. Returns the start time, or null if the day is full. */
export function schedulePlace(s: State, placeId: string, date: string, duration = 90): number | null {
  const p = s.places.find((x) => x.id === placeId)!;
  const start = findSlot(dayItems(s, p.tripId, date), duration);
  if (start === null) return null;
  const item: ItineraryItem = {
    id: uid("i"),
    tripId: p.tripId,
    date,
    title: p.name,
    placeId,
    start,
    duration,
    fixed: false,
    kind: "activity",
    checkedIn: false,
    aiGenerated: false,
    createdBy: s.me,
    createdAt: now(),
  };
  commit(s, p.tripId, [item], bi(`Added ${p.name} at ${formatTime(start)}`, `在 ${formatTime(start)} 加入了 ${p.name}`), "manual");
  p.status = "scheduled";
  return start;
}

// ---------------------------------------------------------------- itinerary

export function updateItem(s: State, itemId: string, patch: Partial<Pick<ItineraryItem, "title" | "start" | "duration" | "date">>): string | null {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return "missing";
  if (item.fixed && (patch.start !== undefined || patch.date !== undefined)) return "locked";
  const next = { ...item, ...patch, aiGenerated: false };
  commit(s, item.tripId, [next], bi(`Edited ${next.title}`, `编辑了 ${next.title}`), "manual");
  return null;
}

/** Deleting an item keeps its tickets and photos; they become unmatched. */
export function deleteItem(s: State, itemId: string): void {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return;
  commit(s, item.tripId, [], bi(`Removed ${item.title}`, `删除了 ${item.title}`), "manual", [itemId]);
  for (const t of s.tickets) if (t.itemId === itemId) t.itemId = undefined;
  for (const p of s.photos) if (p.itemId === itemId) p.itemId = undefined;
  if (item.placeId && !s.items.some((i) => i.placeId === item.placeId)) setPlaceStatus(s, item.placeId, "want");
}

export function setLocked(s: State, itemId: string, fixed: boolean): void {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return;
  const next: ItineraryItem = { ...item, fixed, fixedReason: fixed ? item.fixedReason ?? "manual" : undefined };
  commit(s, item.tripId, [next], fixed ? bi(`Locked ${item.title}`, `锁定了 ${item.title}`) : bi(`Unlocked ${item.title}`, `解锁了 ${item.title}`), "manual");
}

export function checkIn(s: State, itemId: string, value = true): void {
  const item = s.items.find((i) => i.id === itemId);
  if (!item) return;
  item.checkedIn = value;
  if (item.placeId) setPlaceStatus(s, item.placeId, value ? "visited" : "scheduled");
}

// -------------------------------------------------------------------- tickets

export function addTicket(s: State, tripId: string, fields: Partial<Ticket> & { name: string }): Ticket {
  const ticket: Ticket = { id: uid("t-"), tripId, status: "pending", uploadedBy: s.me, createdAt: now(), ...fields };
  ticket.itemId = ticket.itemId ?? matchTicket(s, ticket);
  s.tickets.unshift(ticket);
  return ticket;
}

/** Matches a ticket to an itinerary item by name and date; undefined when unsure. */
export function matchTicket(s: State, ticket: Pick<Ticket, "tripId" | "name" | "date">): string | undefined {
  if (!ticket.date || !ticket.name) return undefined;
  const words = (x: string) => x.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
  const want = new Set(words(ticket.name));
  const candidates = dayItems(s, ticket.tripId, ticket.date).filter((i) => {
    const place = s.places.find((p) => p.id === i.placeId);
    const have = [...words(i.title), ...words(place?.name ?? "")];
    return have.some((w) => want.has(w));
  });
  return candidates.length === 1 ? candidates[0].id : undefined;
}

export type ConfirmResult =
  | { kind: "no-item" }
  | { kind: "no-time" }
  | { kind: "applied"; proposal: Proposal }
  | { kind: "conflict"; proposal: Proposal };

/**
 * Confirms a ticket (section 5). Only confirmed tickets change the plan, and
 * the change applies at once only when it passes the conflict check;
 * otherwise the proposal goes back to the user to choose how to resolve it.
 */
export function confirmTicket(s: State, ticketId: string, fields: Partial<Ticket>): ConfirmResult {
  const ticket = s.tickets.find((t) => t.id === ticketId)!;
  Object.assign(ticket, fields, { status: "confirmed" });
  if (!ticket.itemId) return { kind: "no-item" };
  const item = s.items.find((i) => i.id === ticket.itemId);
  if (!item) return { kind: "no-item" };
  if (ticket.time === undefined) return { kind: "no-time" };

  let day = dayItems(s, ticket.tripId, item.date);
  if (ticket.date && ticket.date !== item.date) {
    // The ticket is for another day: move the item there first.
    day = [...dayItems(s, ticket.tripId, ticket.date), { ...item, date: ticket.date }];
  }
  const proposal = proposeAnchor(day, item.id, ticket.time);
  if (proposal.conflicts.length) return { kind: "conflict", proposal };
  applyProposal(s, ticket.tripId, proposal, "ticket");
  return { kind: "applied", proposal };
}

export function applyProposal(s: State, tripId: string, proposal: Proposal, reason: ChangeReason): ChangeLogEntry {
  const anchor = proposal.items.find((i) => i.id === proposal.anchorId)!;
  const moved = proposal.changes.filter((c) => c.id !== anchor.id).length;
  const from = anchor.originalStart;
  const summary =
    from !== undefined && from !== anchor.start
      ? bi(
          `The ticket says ${formatTime(anchor.start)}, so ${anchor.title} moved from ${formatTime(from)} to ${formatTime(anchor.start)}` +
            (moved ? `; ${moved} other item${moved > 1 ? "s" : ""} adjusted` : ""),
          `票上写的是 ${formatTime(anchor.start)}，所以${anchor.title}从 ${formatTime(from)} 调到 ${formatTime(anchor.start)}` +
            (moved ? `；另有 ${moved} 项随之调整` : ""),
        )
      : bi(`${anchor.title} locked to its ticket time`, `${anchor.title} 已按票锁定`);
  return commit(s, tripId, proposal.items, summary, reason);
}

/** Items in a proposal's conflicts that are allowed to move (not fixed). */
export function movableConflictIds(proposal: Proposal): string[] {
  const ids = proposal.conflicts.flatMap((c) => [c.itemId, c.withItemId ?? ""]);
  return [...new Set(ids)].filter((id) => {
    const i = proposal.items.find((x) => x.id === id);
    return i && !i.fixed;
  });
}

/**
 * Conflict choice "move to another day": the colliding flexible items go to
 * `date`. Only offered when `movableConflictIds` is not empty.
 */
export function resolveByMoving(s: State, tripId: string, proposal: Proposal, date: string): ChangeLogEntry {
  const movingIds = new Set(movableConflictIds(proposal));
  if (!movingIds.size) throw new Error("Nothing in this conflict can move");
  const target = dayItems(s, tripId, date).filter((i) => !movingIds.has(i.id));
  const moved: ItineraryItem[] = [];
  for (const id of movingIds) {
    const i = proposal.items.find((x) => x.id === id)!;
    const start = findSlot([...target, ...moved], i.duration, 9 * 60, 23 * 60) ?? 9 * 60;
    moved.push({ ...i, date, start });
  }
  const rest = proposal.items.filter((i) => !movingIds.has(i.id));
  applyProposal(s, tripId, { ...proposal, items: rest }, "conflict");
  return commit(
    s,
    tripId,
    moved,
    bi(`Moved ${moved.map((m) => m.title).join(", ")} to ${date} to resolve a conflict`, `为解决冲突，把 ${moved.map((m) => m.title).join("、")} 挪到了 ${date}`),
    "conflict",
  );
}

// --------------------------------------------------------------------- photos

export function addPhoto(s: State, tripId: string, fileId: string, itemId?: string, note?: string): void {
  s.photos.push({ id: uid("ph-"), tripId, fileId, itemId, note, takenAt: now(), hidden: false, uploadedBy: s.me, createdAt: now() });
}

// ---------------------------------------------------------------- quick notes

export interface NoteResult {
  noteId: string;
  savedTo: Bilingual;
  answer?: Bilingual;
}

/**
 * Files a quick note where it belongs (section 4.8). Callers show high-risk
 * kinds as a preview first and only call this once the user taps to save.
 */
export function fileQuickNote(
  s: State,
  tripId: string,
  text: string,
  c: NoteClassification = classifyNote(text),
  contextItemId?: string,
): NoteResult {
  const note: QuickNote = {
    id: uid("n-"),
    tripId,
    text,
    kind: c.kind,
    visibility: "private",
    undone: false,
    createdBy: s.me,
    createdAt: now(),
  };
  let savedTo = bi("Notes", "笔记");
  let answer: Bilingual | undefined;
  const contextItem = s.items.find((i) => i.id === contextItemId);

  switch (c.kind) {
    case "question":
      answer = answerQuestion(s, tripId, text);
      savedTo = bi("Answered", "已回答");
      break;
    case "todo": {
      const todo: Todo = { id: uid("td"), tripId, text, done: false, createdBy: s.me, createdAt: now() };
      s.todos.unshift(todo);
      note.targetId = todo.id;
      note.visibility = "group";
      savedTo = bi("Group to-dos", "小组待办");
      break;
    }
    case "reminder": {
      const r: Reminder = { id: uid("r"), tripId, text, createdBy: s.me, createdAt: now() };
      s.reminders.unshift(r);
      note.targetId = r.id;
      savedTo = bi("Your reminders", "你的提醒");
      break;
    }
    case "place": {
      const { placeId } = addPlace(s, tripId, { name: c.placeName!, category: "other", reason: text });
      note.targetId = placeId;
      note.visibility = "group";
      savedTo = bi(`Place pool: ${c.placeName}`, `地点池：${c.placeName}`);
      break;
    }
    case "itinerary-change":
      note.visibility = "group";
      savedTo = bi("Proposed itinerary changes", "行程调整建议");
      break;
    case "expense":
      savedTo = bi("Notes (expense log comes in phase 2)", "笔记（记账功能在第二阶段）");
      break;
    case "note":
      if (contextItem) {
        note.targetId = contextItem.id;
        savedTo = bi(`${contextItem.title}, note`, `${contextItem.title}，笔记`);
      } else {
        const mentioned = s.places.find((p) => p.tripId === tripId && text.toLowerCase().includes(p.name.split(/[ (]/)[0].toLowerCase()));
        if (mentioned) {
          note.targetId = mentioned.id;
          savedTo = bi(`${mentioned.name}, note`, `${mentioned.name}，笔记`);
        }
      }
      break;
  }
  s.notes.unshift(note);
  return { noteId: note.id, savedTo, answer };
}

export function undoQuickNote(s: State, noteId: string): void {
  const note = s.notes.find((n) => n.id === noteId);
  if (!note || note.undone) return;
  note.undone = true;
  if (note.kind === "todo") s.todos = s.todos.filter((t) => t.id !== note.targetId);
  if (note.kind === "reminder") s.reminders = s.reminders.filter((r) => r.id !== note.targetId);
  if (note.kind === "place") {
    const created = s.places.find((p) => p.id === note.targetId && p.createdAt >= note.createdAt);
    if (created) s.places = s.places.filter((p) => p !== created);
  }
}

/** Answers only from data already in this trip; says so when nothing is found. */
export function answerQuestion(s: State, tripId: string, text: string): Bilingual {
  const q = text.toLowerCase();
  if (/ticket|票/.test(q)) {
    const pending = s.tickets.filter((t) => t.tripId === tripId && t.status === "pending");
    if (!pending.length) return bi("All tickets are confirmed.", "所有票都已确认。");
    const list = pending.map((t) => `${t.name}${t.date ? ` (${t.date})` : ""}`).join(", ");
    return bi(`Still pending: ${list}.`, `还没确认的票：${list}。`);
  }
  if (/to-?do|待办/.test(q)) {
    const open = s.todos.filter((t) => t.tripId === tripId && !t.done).map((t) => t.text);
    return open.length ? bi(`Open to-dos: ${open.join("; ")}.`, `未完成待办：${open.join("；")}。`) : bi("No open to-dos.", "没有未完成的待办。");
  }
  const trip = s.trips.find((t) => t.id === tripId)!;
  const dayMatch = /day after tomorrow|后天/.test(q) ? 2 : /tomorrow|明天/.test(q) ? 1 : /today|今天/.test(q) ? 0 : null;
  if (dayMatch !== null && /leave|start|first|出发|几点|开始/.test(q)) {
    const today = new Date().toISOString().slice(0, 10);
    const base = today >= trip.startDate && today <= trip.endDate ? today : trip.startDate;
    const date = addDays(base, dayMatch);
    const first = dayItems(s, tripId, date).find((i) => i.kind === "activity");
    if (first) {
      return bi(`On ${date} the first stop is ${first.title} at ${formatTime(first.start)}.`, `${date} 第一站是 ${first.title}，${formatTime(first.start)}。`);
    }
  }
  return bi("I couldn't find that in this trip.", "这次行程里没找到相关内容。");
}

// --------------------------------------------------------------------- album

export function albumProgress(s: State, tripId: string) {
  const activities = s.items.filter((i) => i.tripId === tripId && i.kind === "activity");
  return { done: activities.filter((i) => i.checkedIn).length, total: activities.length };
}

export function tripDays(trip: Trip): string[] {
  return dateRange(trip.startDate, trip.endDate);
}
