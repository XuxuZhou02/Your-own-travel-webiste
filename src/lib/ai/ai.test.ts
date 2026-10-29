import { describe, expect, it } from "vitest";
import { readTicketFromFileName } from ".";
import { classifyNote } from "./notes";
import { detectPlatform, normalizeUrl } from "../links";
import { nearbyPlaces } from "../geo";
import type { Place } from "../types";

describe("classifyNote", () => {
  it.each([
    ["The Louvre queue was long, go earlier next time", "note", "low"],
    ["Book a restaurant for Friday night", "todo", "low"],
    ["A friend says there's a great croissant shop called Du Pain in the Marais", "place", "high"],
    ["Remind me at 8 tomorrow to pick up tickets", "reminder", "low"],
    ["Move Wednesday to Versailles in the afternoon", "itinerary-change", "high"],
    ["The taxi just cost 25 euros", "expense", "high"],
    ["Which tickets are still unconfirmed?", "question", "low"],
    ["明天去卢浮宫记得带护照", "todo", "low"],
    ["提醒我明早8点取票", "reminder", "low"],
    ["朋友说玛黑区有家叫Du Pain的可颂店很好吃", "place", "high"],
    ["周三改到下午去凡尔赛", "itinerary-change", "high"],
    ["打车花了25欧", "expense", "high"],
    ["哪些票还没确认？", "question", "low"],
  ])("%s → %s", (text, kind, risk) => {
    const c = classifyNote(text);
    expect(c.kind).toBe(kind);
    expect(c.risk).toBe(risk);
  });

  it("extracts place names and amounts", () => {
    expect(classifyNote("there's a shop called Du Pain in the Marais").placeName).toBe("Du Pain");
    expect(classifyNote("朋友说有家叫Du Pain的可颂店").placeName).toBe("Du Pain");
    expect(classifyNote("The taxi just cost 25 euros, split between the four of us")).toMatchObject({
      amount: 25,
      currency: "EUR",
    });
  });
});

describe("readTicketFromFileName", () => {
  it("reads date, time and name when the file name has them", () => {
    expect(readTicketFromFileName("Louvre-ticket_2027-04-13_1000.pdf")).toMatchObject({
      name: "Louvre",
      date: "2027-04-13",
      time: 600,
    });
  });

  it("leaves unknown fields empty", () => {
    expect(readTicketFromFileName("IMG_4821.jpg")).toMatchObject({ date: undefined, time: undefined });
  });
});

describe("links", () => {
  it("detects platforms", () => {
    expect(detectPlatform("https://www.xiaohongshu.com/explore/abc")).toBe("xiaohongshu");
    expect(detectPlatform("http://xhslink.com/a/xyz")).toBe("xiaohongshu");
    expect(detectPlatform("https://www.instagram.com/reel/abc/")).toBe("instagram");
    expect(detectPlatform("https://maps.app.goo.gl/abc")).toBe("googlemaps");
    expect(detectPlatform("https://www.google.com/maps/place/Louvre")).toBe("googlemaps");
    expect(detectPlatform("https://example.com/paris")).toBe("web");
  });

  it("pulls the link out of shared text", () => {
    expect(normalizeUrl("看看这家 http://xhslink.com/a/xyz，复制本条信息")).toBe("http://xhslink.com/a/xyz");
    expect(normalizeUrl("no link here")).toBeNull();
  });
});

describe("nearbyPlaces", () => {
  const place = (id: string, lat: number, lng: number, likes = 0): Place => ({
    id,
    tripId: "t",
    name: id,
    location: { lat, lng },
    category: "other",
    status: "want",
    likes: Array.from({ length: likes }, (_, i) => `u${i}`),
    addedBy: "u",
    createdAt: "",
  });

  it("keeps places within the radius, nearest first", () => {
    const louvre = { lat: 48.8606, lng: 2.3376 };
    const pool = [place("far", 48.8584, 2.2945), place("near", 48.8615, 2.3366), place("mid", 48.8636, 2.3366)];
    const result = nearbyPlaces(louvre, pool, 500);
    expect(result.map((r) => r.place.id)).toEqual(["near", "mid"]);
    expect(result[0].walkMinutes).toBeGreaterThanOrEqual(1);
  });
});
