import { describe, expect, it } from "vitest";
import { demoState } from "./seed";
import {
  addPlace,
  applyProposal,
  confirmTicket,
  dayItems,
  deleteItem,
  fileQuickNote,
  movableConflictIds,
  resolveByMoving,
  schedulePlace,
  undoChange,
  undoQuickNote,
} from "./state";
import { formatTime, parseTime as t } from "./time";

const TRIP = "trip-paris";
const times = (s: ReturnType<typeof demoState>, date: string) =>
  dayItems(s, TRIP, date).map((i) => `${formatTime(i.start)} ${i.title}`);

describe("ticket-driven changes on the demo trip", () => {
  it("matches the Louvre ticket and moves the day around it, with one-tap undo", () => {
    const s = demoState();
    const before = times(s, "2027-04-13");
    const ticket = s.tickets.find((x) => x.id === "t-louvre")!;
    expect(ticket.status).toBe("pending");

    const result = confirmTicket(s, ticket.id, { itemId: "i3" });
    expect(result.kind).toBe("applied");
    expect(times(s, "2027-04-13")).toEqual([
      "10:00 Louvre Museum",
      "13:30 Café Kitsuné Palais Royal",
      "15:00 Musée d'Orsay",
      "19:30 Dinner near the Seine",
    ]);
    const louvre = s.items.find((i) => i.id === "i3")!;
    expect(louvre).toMatchObject({ fixed: true, fixedReason: "ticket", originalStart: t("09:00") });
    expect(s.changeLog[0].summary.en).toContain("moved from 09:00 to 10:00");

    undoChange(s, s.changeLog[0].id);
    expect(times(s, "2027-04-13")).toEqual(before);
    expect(s.changeLog[0].undone).toBe(true);
  });

  it("returns a conflict instead of moving the fixed Eiffel Tower", () => {
    const s = demoState();
    const t1 = s.tickets[0];
    Object.assign(t1, { name: "Palace of Versailles", date: "2027-04-14", time: t("15:00"), itemId: "i7" });
    const result = confirmTicket(s, t1.id, {});
    expect(result.kind).toBe("conflict");
    if (result.kind !== "conflict") return;
    expect(result.proposal.conflicts).toContainEqual({ type: "overlap-fixed", itemId: "i7", withItemId: "i8" });
    // Both sides are locked, so "move to another day" isn't offered.
    expect(movableConflictIds(result.proposal)).toEqual([]);
    // Nothing changed until the user chooses.
    expect(s.items.find((i) => i.id === "i7")!.start).toBe(t("09:30"));

    applyProposal(s, TRIP, result.proposal, "conflict");
    expect(s.items.find((i) => i.id === "i7")!.start).toBe(t("15:00"));
    expect(s.items.find((i) => i.id === "i8")!.start).toBe(t("19:00"));
  });

  it("can resolve a conflict by moving the flexible item to another day", () => {
    const s = demoState();
    s.items.push({ ...s.items.find((i) => i.id === "i6")!, id: "late", date: "2027-04-14", start: t("17:00"), duration: 120, title: "Late tea" });
    const ticket = s.tickets[0];
    Object.assign(ticket, { name: "Palace of Versailles", date: "2027-04-14", time: t("12:00"), itemId: "i7" });
    const result = confirmTicket(s, ticket.id, {});
    expect(result.kind).toBe("conflict");
    if (result.kind !== "conflict") return;
    expect(movableConflictIds(result.proposal)).toEqual(["late"]);
    resolveByMoving(s, TRIP, result.proposal, "2027-04-16");
    expect(s.items.find((i) => i.id === "late")!.date).toBe("2027-04-16");
  });
});

describe("place pool", () => {
  it("merges a second link for the same place into one card", () => {
    const s = demoState();
    const count = s.places.length;
    const r = addPlace(s, TRIP, { name: "louvre museum", category: "sight", link: "https://www.instagram.com/p/xyz/" });
    expect(r).toEqual({ placeId: "p-louvre", merged: true });
    expect(s.places.length).toBe(count);
    expect(s.sources.filter((x) => x.placeId === "p-louvre").map((x) => x.platform)).toEqual(["googlemaps", "instagram"]);
  });

  it("schedules a place into the first free slot and logs it", () => {
    const s = demoState();
    const start = schedulePlace(s, "p-fumoir", "2027-04-15", 60);
    expect(start).toBe(t("18:00"));
    expect(s.places.find((p) => p.id === "p-fumoir")!.status).toBe("scheduled");
    expect(s.changeLog).toHaveLength(1);
  });

  it("keeps tickets when their item is deleted, as unmatched", () => {
    const s = demoState();
    deleteItem(s, "i8");
    expect(s.tickets.find((x) => x.id === "t-eiffel")!.itemId).toBeUndefined();
    expect(s.places.find((p) => p.id === "p-eiffel")!.status).toBe("want");
  });
});

describe("quick notes", () => {
  it("files notes, to-dos and places, and undoes them", () => {
    const s = demoState();
    const a = fileQuickNote(s, TRIP, "The Louvre queue was long, go earlier next time");
    expect(a.savedTo.en).toBe("Louvre Museum, note");

    const b = fileQuickNote(s, TRIP, "Book a table for Saturday lunch");
    expect(s.todos[0].text).toBe("Book a table for Saturday lunch");
    undoQuickNote(s, b.noteId);
    expect(s.todos.some((x) => x.text === "Book a table for Saturday lunch")).toBe(false);

    const count = s.places.length;
    const c = fileQuickNote(s, TRIP, "A friend says there's a great bakery called Mamiche in the 9th");
    expect(s.places.length).toBe(count + 1);
    undoQuickNote(s, c.noteId);
    expect(s.places.length).toBe(count);
  });

  it("answers questions only from trip data", () => {
    const s = demoState();
    expect(fileQuickNote(s, TRIP, "Which tickets are still unconfirmed?").answer!.en).toBe(
      "Still pending: Louvre Museum (2027-04-13).",
    );
    expect(fileQuickNote(s, TRIP, "Where is the nearest pharmacy?").answer!.en).toBe("I couldn't find that in this trip.");
  });
});
