// Ticket-driven itinerary changes (product plan, sections 4.5 and 5).
//
// A ticket is a fact, a plan is an intention: an item with a ticket becomes a
// fixed anchor and everything else on that day is rearranged around it. This
// module is pure rule code so it can be tested on its own, and it is also the
// validator any AI proposal must pass before it takes effect.

import type { ItineraryItem } from "./types";

export const DAY_START = 7 * 60;
export const DAY_END = 24 * 60;
/** Travel buffer kept between consecutive items when they have to move. */
export const TRAVEL_BUFFER = 30;

export type ConflictType = "overlap-fixed" | "before-day-start" | "past-day-end";

export interface Conflict {
  type: ConflictType;
  itemId: string;
  withItemId?: string;
}

export interface Change {
  id: string;
  from: number;
  to: number;
}

export interface Proposal {
  date: string;
  anchorId: string;
  /** The full new list of items for that day, in time order. */
  items: ItineraryItem[];
  changes: Change[];
  conflicts: Conflict[];
}

const end = (i: ItineraryItem) => i.start + i.duration;

export function sortByStart(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) => a.start - b.start || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Proposes the day's plan after an item is pinned to a ticket's time.
 *
 * The anchor moves to `newStart` and becomes fixed. Other items keep their
 * relative order and their own durations; they are pushed back (after the
 * anchor) or pulled earlier (before it) only as far as needed, keeping a
 * travel buffer. A fixed item never moves: if a moving item would collide
 * with one, the collision is reported as a conflict, not resolved silently.
 */
export function proposeAnchor(dayItems: ItineraryItem[], anchorId: string, newStart: number): Proposal {
  const anchorOrig = dayItems.find((i) => i.id === anchorId);
  if (!anchorOrig) throw new Error(`Item ${anchorId} is not on this day`);

  const anchor: ItineraryItem = {
    ...anchorOrig,
    start: newStart,
    fixed: true,
    fixedReason: "ticket",
    originalStart: anchorOrig.start !== newStart ? anchorOrig.originalStart ?? anchorOrig.start : anchorOrig.originalStart,
  };

  // Others keep their relative order; the anchor slots in by its new time.
  const others = sortByStart(dayItems.filter((i) => i.id !== anchorId)).map((i) => ({ ...i }));
  let at = others.findIndex((o) => o.start > newStart || (o.start === newStart && !o.fixed));
  if (at === -1) at = others.length;
  const seq = [...others.slice(0, at), anchor, ...others.slice(at)];
  const idx = at;

  const origStart = new Map(dayItems.map((i) => [i.id, i.start]));
  // Gaps in the original plan, capped at the travel buffer: items that
  // already touched may keep touching, others keep time to get there.
  const gapBefore = new Map<string, number>();
  const gapAfter = new Map<string, number>();
  const orig = sortByStart(dayItems);
  for (let k = 1; k < orig.length; k++) {
    const gap = Math.min(TRAVEL_BUFFER, Math.max(0, orig[k].start - end(orig[k - 1])));
    gapBefore.set(orig[k].id, gap);
    gapAfter.set(orig[k - 1].id, gap);
  }
  const conflicts: Conflict[] = [];

  // Forward pass: push later items back as needed.
  for (let k = idx + 1; k < seq.length; k++) {
    const prev = seq[k - 1];
    const cur = seq[k];
    const earliest = end(prev) + (gapBefore.get(cur.id) ?? TRAVEL_BUFFER);
    if (cur.start >= earliest) continue;
    if (cur.fixed) {
      if (end(prev) > cur.start) conflicts.push({ type: "overlap-fixed", itemId: prev.id, withItemId: cur.id });
      continue;
    }
    cur.start = earliest;
  }

  // Backward pass: pull earlier items forward in time as needed.
  for (let k = idx - 1; k >= 0; k--) {
    const next = seq[k + 1];
    const cur = seq[k];
    const latestEnd = next.start - (gapAfter.get(cur.id) ?? TRAVEL_BUFFER);
    if (end(cur) <= latestEnd) continue;
    if (cur.fixed) {
      if (end(cur) > next.start) conflicts.push({ type: "overlap-fixed", itemId: next.id, withItemId: cur.id });
      continue;
    }
    cur.start = latestEnd - cur.duration;
  }

  for (const i of seq) {
    if (i.start < DAY_START) conflicts.push({ type: "before-day-start", itemId: i.id });
    if (end(i) > DAY_END) conflicts.push({ type: "past-day-end", itemId: i.id });
  }

  const changes: Change[] = seq
    .filter((i) => origStart.get(i.id) !== i.start)
    .map((i) => ({ id: i.id, from: origStart.get(i.id)!, to: i.start }));

  return { date: anchor.date, anchorId, items: seq, changes, conflicts: dedupe(conflicts) };
}

/**
 * Fixed rules every plan must satisfy before it is applied: no overlap with
 * a fixed item, and everything inside the day. Returns the violations.
 */
export function validateDay(dayItems: ItineraryItem[]): Conflict[] {
  const sorted = sortByStart(dayItems);
  const conflicts: Conflict[] = [];
  for (let a = 0; a < sorted.length; a++) {
    const x = sorted[a];
    if (x.start < DAY_START) conflicts.push({ type: "before-day-start", itemId: x.id });
    if (end(x) > DAY_END) conflicts.push({ type: "past-day-end", itemId: x.id });
    for (let b = a + 1; b < sorted.length && sorted[b].start < end(x); b++) {
      const y = sorted[b];
      if (x.fixed || y.fixed) {
        const [moving, fixed] = x.fixed ? [y, x] : [x, y];
        conflicts.push({ type: "overlap-fixed", itemId: moving.id, withItemId: fixed.id });
      }
    }
  }
  return dedupe(conflicts);
}

/**
 * Finds a start time for a new item of `duration` minutes: the first gap
 * between `from` and `until` that fits it with travel buffers on both sides.
 */
export function findSlot(
  dayItems: ItineraryItem[],
  duration: number,
  from = 9 * 60,
  until = 22 * 60,
): number | null {
  let cursor = from;
  for (const i of sortByStart(dayItems)) {
    if (end(i) + TRAVEL_BUFFER <= cursor) continue;
    if (cursor + duration + TRAVEL_BUFFER <= i.start) break;
    cursor = Math.max(cursor, end(i) + TRAVEL_BUFFER);
  }
  return cursor + duration <= until ? cursor : null;
}

function dedupe(conflicts: Conflict[]): Conflict[] {
  const seen = new Set<string>();
  return conflicts.filter((c) => {
    const key = `${c.type}:${c.itemId}:${c.withItemId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
