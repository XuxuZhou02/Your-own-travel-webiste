import { describe, expect, it } from "vitest";
import { generateSkeleton, type SkeletonInput } from "./skeleton";
import { parseTime as t } from "./time";

let n = 0;
const input = (over: Partial<SkeletonInput> = {}): SkeletonInput => ({
  tripId: "trip",
  startDate: "2027-04-12",
  endDate: "2027-04-17",
  arrivalTime: t("14:30"),
  departureTime: t("11:00"),
  pace: "moderate",
  createdBy: "u",
  now: "2026-10-29T00:00:00Z",
  newId: () => `id${n++}`,
  ...over,
});

const activities = (items: ReturnType<typeof generateSkeleton>, date: string) =>
  items.filter((i) => i.date === date && i.kind === "activity");

describe("generateSkeleton", () => {
  it("gives full days the pace's number of blocks and half days on arrival and departure", () => {
    const items = generateSkeleton(input());
    expect(activities(items, "2027-04-12").map((i) => i.start)).toEqual([t("19:00")]);
    expect(activities(items, "2027-04-13")).toHaveLength(3);
    expect(activities(items, "2027-04-16")).toHaveLength(3);
    // Leaving at 11:00 leaves no room for a block on the last day.
    expect(activities(items, "2027-04-17")).toHaveLength(0);
    expect(items.every((i) => i.aiGenerated && !i.fixed)).toBe(true);
  });

  it("maps pace to 2, 3 or 4 main items per day", () => {
    for (const [pace, count] of [["relaxed", 2], ["moderate", 3], ["packed", 4]] as const) {
      expect(activities(generateSkeleton(input({ pace })), "2027-04-14")).toHaveLength(count);
    }
  });

  it("schedules only a check-in marker when arriving after 22:00", () => {
    const items = generateSkeleton(input({ arrivalTime: t("22:40") }));
    const day1 = items.filter((i) => i.date === "2027-04-12");
    expect(day1).toHaveLength(1);
    expect(day1[0].kind).toBe("marker");
  });

  it("puts must-sees first and keeps nearby ones on the same day", () => {
    const louvre = { name: "Louvre", location: { lat: 48.8606, lng: 2.3376 } };
    const tower = { name: "Eiffel Tower", location: { lat: 48.8584, lng: 2.2945 } };
    const orangerie = { name: "Orangerie", location: { lat: 48.8638, lng: 2.3226 } };
    const trocadero = { name: "Trocadéro", location: { lat: 48.8616, lng: 2.2893 } };
    const items = generateSkeleton(input({ arrivalTime: t("23:00"), mustSee: [louvre, tower, orangerie, trocadero] }));
    const titles = activities(items, "2027-04-13").map((i) => i.title);
    expect(titles).toEqual(["Louvre", "Orangerie", "Eiffel Tower"]);
    expect(activities(items, "2027-04-14")[0].title).toBe("Trocadéro");
  });
});
