// Itinerary skeleton (product plan, section 4.1): a few inputs become an
// editable day-by-day draft, so the organizer never starts from a blank page.

import { distanceMeters } from "./geo";
import { dateRange } from "./time";
import type { ItineraryItem, LatLng, Pace } from "./types";

export interface SkeletonInput {
  tripId: string;
  startDate: string;
  endDate: string;
  arrivalTime: number;
  departureTime: number;
  pace: Pace;
  hotel?: LatLng;
  /** Must-see places, scheduled first. Earlier entries go on earlier days. */
  mustSee?: { name: string; placeId?: string; location?: LatLng }[];
  createdBy: string;
  now: string;
  newId: () => string;
}

interface Slot {
  label: { en: string; zh: string };
  start: number;
  duration: number;
}

const M = (en: string, zh: string) => ({ en, zh });

/** Morning, afternoon and evening blocks; gaps between them are meal and travel buffers. */
export const PACE_SLOTS: Record<Pace, Slot[]> = {
  relaxed: [
    { label: M("Morning", "上午"), start: 10 * 60, duration: 180 },
    { label: M("Afternoon", "下午"), start: 15 * 60, duration: 180 },
  ],
  moderate: [
    { label: M("Morning", "上午"), start: 9 * 60 + 30, duration: 150 },
    { label: M("Afternoon", "下午"), start: 14 * 60, duration: 150 },
    { label: M("Evening", "晚上"), start: 19 * 60, duration: 120 },
  ],
  packed: [
    { label: M("Morning", "上午"), start: 9 * 60, duration: 120 },
    { label: M("Late morning", "午前"), start: 11 * 60 + 30, duration: 90 },
    { label: M("Afternoon", "下午"), start: 14 * 60 + 30, duration: 150 },
    { label: M("Evening", "晚上"), start: 19 * 60, duration: 120 },
  ],
};

/** After landing: time to reach the hotel before the first activity. */
const ARRIVAL_BUFFER = 90;
/** Before leaving: time to get to the station or airport. */
const DEPARTURE_BUFFER = 180;
/** Arriving at or after this time leaves only a check-in marker that day. */
const LATE_ARRIVAL = 22 * 60;

export function generateSkeleton(input: SkeletonInput): ItineraryItem[] {
  const days = dateRange(input.startDate, input.endDate);
  const slots = PACE_SLOTS[input.pace];
  const items: ItineraryItem[] = [];

  const base = {
    tripId: input.tripId,
    fixed: false,
    checkedIn: false,
    aiGenerated: true,
    createdBy: input.createdBy,
    createdAt: input.now,
  } as const;

  const daySlots: { date: string; slots: Slot[] }[] = days.map((date, i) => {
    let usable = slots;
    if (i === 0) {
      usable = input.arrivalTime >= LATE_ARRIVAL ? [] : usable.filter((s) => s.start >= input.arrivalTime + ARRIVAL_BUFFER);
    }
    if (i === days.length - 1) {
      usable = usable.filter((s) => s.start + s.duration <= input.departureTime - DEPARTURE_BUFFER);
    }
    return { date, slots: usable };
  });

  // Must-sees fill the earliest days first (they often need tickets booked in
  // advance), clustered so places close together share a day.
  const queue = clusterByDistance(input.mustSee ?? [], input.hotel);
  const assigned = new Map<string, { name: string; placeId?: string }>();
  for (const { date, slots: s } of daySlots) {
    for (let n = 0; n < s.length && queue.length; n++) {
      assigned.set(`${date}#${n}`, queue.shift()!);
    }
  }

  days.forEach((date, i) => {
    if (i === 0) {
      items.push({
        ...base,
        id: input.newId(),
        date,
        title: "Check in at hotel · 入住酒店",
        start: Math.min(input.arrivalTime + 60, 23 * 60),
        duration: 30,
        kind: "marker",
      });
    }
    daySlots[i].slots.forEach((slot, n) => {
      const pick = assigned.get(`${date}#${n}`);
      items.push({
        ...base,
        id: input.newId(),
        date,
        title: pick?.name ?? `${slot.label.en} · ${slot.label.zh}`,
        placeId: pick?.placeId,
        start: slot.start,
        duration: slot.duration,
        kind: "activity",
      });
    });
  });

  return items;
}

/**
 * Orders places so that neighbours end up next to each other: start with the
 * first must-see, then repeatedly take the nearest remaining one. Places
 * without coordinates keep their original order at the end.
 */
function clusterByDistance<T extends { location?: LatLng }>(places: T[], hotel?: LatLng): T[] {
  const located = places.filter((p) => p.location);
  const rest = places.filter((p) => !p.location);
  if (located.length < 2) return [...located, ...rest];
  const out: T[] = [located.shift()!];
  while (located.length) {
    const from = out[out.length - 1].location ?? hotel!;
    let best = 0;
    for (let k = 1; k < located.length; k++) {
      if (distanceMeters(from, located[k].location!) < distanceMeters(from, located[best].location!)) best = k;
    }
    out.push(located.splice(best, 1)[0]);
  }
  return [...out, ...rest];
}
