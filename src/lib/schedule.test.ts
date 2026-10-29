import { describe, expect, it } from "vitest";
import { findSlot, proposeAnchor, validateDay } from "./schedule";
import { parseTime as t } from "./time";
import type { ItineraryItem } from "./types";

function item(id: string, start: string, duration: number, extra: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id,
    tripId: "trip",
    date: "2027-04-13",
    title: id,
    start: t(start),
    duration,
    fixed: false,
    kind: "activity",
    checkedIn: false,
    aiGenerated: false,
    createdBy: "u",
    createdAt: "2026-10-29T00:00:00Z",
    ...extra,
  };
}

const startOf = (p: { items: ItineraryItem[] }, id: string) => p.items.find((i) => i.id === id)!.start;

describe("proposeAnchor", () => {
  it("moves the ticketed item, marks it fixed and pushes later items back", () => {
    const day = [item("louvre", "09:00", 180), item("lunch", "12:30", 60), item("orsay", "14:00", 120)];
    const p = proposeAnchor(day, "louvre", t("10:00"));

    const louvre = p.items.find((i) => i.id === "louvre")!;
    expect(louvre.start).toBe(t("10:00"));
    expect(louvre.fixed).toBe(true);
    expect(louvre.fixedReason).toBe("ticket");
    expect(louvre.originalStart).toBe(t("09:00"));
    // Louvre now ends at 13:00; lunch moves to 13:30 and ends 14:30; Orsay follows.
    expect(startOf(p, "lunch")).toBe(t("13:30"));
    expect(startOf(p, "orsay")).toBe(t("15:00"));
    expect(p.items.map((i) => i.duration)).toEqual([180, 60, 120]);
    expect(p.conflicts).toEqual([]);
    expect(p.changes.map((c) => c.id).sort()).toEqual(["louvre", "lunch", "orsay"]);
  });

  it("leaves items alone when there is enough slack", () => {
    const day = [item("louvre", "09:00", 120), item("dinner", "19:00", 90)];
    const p = proposeAnchor(day, "louvre", t("10:00"));
    expect(startOf(p, "dinner")).toBe(t("19:00"));
    expect(p.changes).toEqual([{ id: "louvre", from: t("09:00"), to: t("10:00") }]);
  });

  it("locks the item without other changes when the ticket matches the plan", () => {
    const day = [item("louvre", "10:00", 120), item("lunch", "12:30", 60)];
    const p = proposeAnchor(day, "louvre", t("10:00"));
    expect(p.changes).toEqual([]);
    expect(p.items[0].fixed).toBe(true);
    expect(p.items[0].originalStart).toBeUndefined();
  });

  it("pulls earlier items forward when the ticket is earlier than planned", () => {
    const day = [item("cafe", "09:00", 60), item("louvre", "11:00", 120)];
    const p = proposeAnchor(day, "louvre", t("09:30"));
    // Louvre now comes first in time; the café keeps its relative order.
    expect(p.items.map((i) => i.id)).toEqual(["cafe", "louvre"]);
    expect(startOf(p, "cafe")).toBe(t("08:00"));
  });

  it("reports a conflict instead of moving another fixed item", () => {
    const day = [
      item("louvre", "09:00", 180),
      item("lunch", "12:30", 60),
      item("tower", "14:00", 90, { fixed: true, fixedReason: "ticket" }),
    ];
    const p = proposeAnchor(day, "louvre", t("11:00"));
    expect(startOf(p, "tower")).toBe(t("14:00"));
    expect(p.conflicts).toContainEqual({ type: "overlap-fixed", itemId: "lunch", withItemId: "tower" });
  });

  it("reports items pushed past the end of the day", () => {
    const day = [item("show", "20:00", 120), item("bar", "22:30", 90)];
    const p = proposeAnchor(day, "show", t("21:30"));
    expect(p.conflicts).toContainEqual({ type: "past-day-end", itemId: "bar" });
  });

  it("slots the anchor in by its new time when it jumps past other items", () => {
    const day = [item("louvre", "09:00", 120), item("lunch", "12:00", 60), item("walk", "16:00", 60)];
    const p = proposeAnchor(day, "louvre", t("14:00"));
    expect(p.items.map((i) => i.id)).toEqual(["lunch", "louvre", "walk"]);
    expect(startOf(p, "lunch")).toBe(t("12:00"));
    expect(startOf(p, "walk")).toBe(t("16:30"));
  });
});

describe("validateDay", () => {
  it("accepts a day without overlaps", () => {
    expect(validateDay([item("a", "09:00", 60), item("b", "10:30", 60, { fixed: true })])).toEqual([]);
  });

  it("flags overlap with a fixed item but tolerates overlap between flexible ones", () => {
    expect(validateDay([item("a", "09:00", 60), item("b", "09:30", 60)])).toEqual([]);
    expect(validateDay([item("a", "09:00", 120), item("b", "10:00", 60, { fixed: true })])).toEqual([
      { type: "overlap-fixed", itemId: "a", withItemId: "b" },
    ]);
  });
});

describe("findSlot", () => {
  it("returns the first gap that fits with buffers", () => {
    const day = [item("a", "09:00", 120), item("b", "12:00", 60), item("c", "15:00", 60)];
    expect(findSlot(day, 60)).toBe(t("13:30"));
    expect(findSlot(day, 120)).toBe(t("16:30"));
  });

  it("returns null when the day is full", () => {
    expect(findSlot([item("a", "09:00", 780)], 60)).toBeNull();
  });
});
