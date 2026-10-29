// A demo trip so the prototype is clickable from the first open: five friends
// in Paris, with a pending Louvre ticket whose time differs from the plan.

import type { State } from "./state";
import type { ItineraryItem, Member, Place, QuickNote, Source, Trip } from "./types";
import { parseTime as t } from "./time";

const NOW = "2026-10-29T09:00:00.000Z";
const TRIP = "trip-paris";
const ME = "u-me";

const gmaps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export function demoState(): State {
  const users = [
    { id: ME, name: "You" },
    { id: "u-lin", name: "Lin" },
    { id: "u-sam", name: "Sam" },
    { id: "u-mei", name: "Mei" },
    { id: "u-alex", name: "Alex" },
  ];

  const place = (
    id: string,
    name: string,
    lat: number,
    lng: number,
    category: Place["category"],
    status: Place["status"],
    addedBy: string,
    likes: string[],
  ): Place => ({ id, tripId: TRIP, name, location: { lat, lng }, category, status, likes, addedBy, createdAt: NOW });

  const places: Place[] = [
    place("p-louvre", "Louvre Museum", 48.8606, 2.3376, "sight", "scheduled", "u-lin", [ME, "u-lin", "u-sam", "u-mei", "u-alex"]),
    place("p-kitsune", "Café Kitsuné Palais Royal", 48.8638, 2.337, "cafe", "scheduled", "u-mei", ["u-mei", "u-lin"]),
    place("p-orsay", "Musée d'Orsay", 48.86, 2.3266, "sight", "scheduled", "u-sam", [ME, "u-sam", "u-alex"]),
    place("p-versailles", "Palace of Versailles", 48.8049, 2.1204, "sight", "scheduled", "u-alex", [ME, "u-alex", "u-lin", "u-mei"]),
    place("p-eiffel", "Eiffel Tower", 48.8584, 2.2945, "sight", "scheduled", ME, [ME, "u-sam", "u-mei"]),
    place("p-chapelle", "Sainte-Chapelle", 48.8554, 2.345, "sight", "scheduled", "u-mei", ["u-mei", "u-lin"]),
    place("p-shakespeare", "Shakespeare and Company", 48.8526, 2.3471, "shopping", "scheduled", "u-lin", ["u-lin"]),
    place("p-picasso", "Musée Picasso", 48.8598, 2.3625, "sight", "scheduled", "u-sam", ["u-sam"]),
    place("p-enfants", "Marché des Enfants Rouges", 48.8627, 2.3616, "restaurant", "scheduled", "u-mei", ["u-mei", ME]),
    place("p-fallafel", "L'As du Fallafel", 48.8572, 2.3592, "restaurant", "scheduled", "u-alex", ["u-alex", "u-sam"]),
    place("p-fumoir", "Le Fumoir (French toast brunch)", 48.8608, 2.3408, "cafe", "want", "u-mei", ["u-mei", "u-lin", ME]),
    place("p-pontdesarts", "Pont des Arts", 48.8583, 2.3375, "sight", "want", "u-sam", ["u-sam"]),
    place("p-angelina", "Angelina (hot chocolate)", 48.865, 2.3284, "cafe", "want", "u-lin", ["u-lin", "u-mei"]),
    place("p-dupain", "Du Pain et des Idées", 48.8718, 2.3633, "restaurant", "want", "u-mei", ["u-mei", "u-alex", ME]),
  ];

  const src = (id: string, placeId: string, platform: string, url: string, addedBy: string, title: string, reason?: string): Source => ({
    id,
    placeId,
    platform,
    url,
    title,
    reason,
    addedBy,
    createdAt: NOW,
  });

  const sources: Source[] = [
    src("s1", "p-louvre", "googlemaps", gmaps("Louvre Museum"), "u-lin", "Louvre Museum", "Book the earliest slot to beat the queue"),
    src("s2", "p-fumoir", "xiaohongshu", "https://www.xiaohongshu.com/search_result?keyword=%E5%B7%B4%E9%BB%8E%20%E6%B3%95%E5%BC%8F%E5%90%90%E5%8F%B8", "u-mei", "Paris French toast", "The French toast place right behind the Louvre that everyone on Xiaohongshu recommends"),
    src("s3", "p-fumoir", "googlemaps", gmaps("Le Fumoir Paris"), "u-lin", "Le Fumoir", "Right behind the Louvre"),
    src("s4", "p-kitsune", "instagram", "https://www.instagram.com/explore/tags/cafekitsune/", "u-mei", "#cafekitsune", "Matcha latte in the Palais Royal gardens"),
    src("s5", "p-dupain", "xiaohongshu", "https://www.xiaohongshu.com/search_result?keyword=Du%20Pain%20et%20des%20Id%C3%A9es", "u-mei", "Du Pain et des Idées", "Get the pistachio escargot pastry"),
    src("s6", "p-versailles", "googlemaps", gmaps("Palace of Versailles"), "u-alex", "Palace of Versailles"),
    src("s7", "p-eiffel", "googlemaps", gmaps("Eiffel Tower"), ME, "Eiffel Tower", "Go up after dark for the sparkle"),
    src("s8", "p-angelina", "web", "https://www.angelina-paris.fr/", "u-lin", "Angelina Paris"),
  ];

  let n = 0;
  const item = (date: string, start: string, duration: number, title: string, extra: Partial<ItineraryItem> = {}): ItineraryItem => ({
    id: `i${++n}`,
    tripId: TRIP,
    date,
    title,
    start: t(start),
    duration,
    fixed: false,
    kind: "activity",
    checkedIn: false,
    aiGenerated: true,
    createdBy: ME,
    createdAt: NOW,
    ...extra,
  });

  const items: ItineraryItem[] = [
    item("2027-04-12", "15:30", 30, "Check in at hotel", { kind: "marker" }),
    item("2027-04-12", "19:00", 90, "L'As du Fallafel", { placeId: "p-fallafel" }),
    item("2027-04-13", "09:00", 180, "Louvre Museum", { placeId: "p-louvre" }),
    item("2027-04-13", "12:30", 60, "Café Kitsuné Palais Royal", { placeId: "p-kitsune" }),
    item("2027-04-13", "14:00", 150, "Musée d'Orsay", { placeId: "p-orsay" }),
    item("2027-04-13", "19:30", 90, "Dinner near the Seine"),
    item("2027-04-14", "09:30", 300, "Palace of Versailles", { placeId: "p-versailles" }),
    item("2027-04-14", "19:00", 120, "Eiffel Tower", { placeId: "p-eiffel", fixed: true, fixedReason: "ticket", aiGenerated: false }),
    item("2027-04-15", "10:00", 90, "Sainte-Chapelle", { placeId: "p-chapelle" }),
    item("2027-04-15", "12:00", 60, "Shakespeare and Company", { placeId: "p-shakespeare" }),
    item("2027-04-15", "14:00", 120, "Musée Picasso", { placeId: "p-picasso" }),
    item("2027-04-15", "16:30", 60, "Marché des Enfants Rouges", { placeId: "p-enfants" }),
    item("2027-04-16", "09:30", 150, "Morning"),
    item("2027-04-16", "14:00", 150, "Afternoon"),
    item("2027-04-16", "19:00", 120, "Evening"),
    item("2027-04-17", "08:00", 30, "Leave for the airport", { kind: "marker" }),
  ];

  const past = [
    pastTrip("trip-kyoto", "Kyoto in November", "Kyoto", "2025-11-14", "film", users, [
      ["2025-11-14", "08:00", "Fushimi Inari Taisha", "We reached the top just as the sun came through the gates.", "u-mei"],
      ["2025-11-14", "12:30", "Nishiki Market", "Sam ate four skewers of tamagoyaki. Four.", "u-lin"],
      ["2025-11-15", "09:00", "Kiyomizu-dera", "The whole hillside was red.", "u-alex"],
      ["2025-11-15", "11:30", "Sannenzaka", "", ""],
      ["2025-11-15", "17:00", "Gion at dusk", "Lanterns coming on one by one.", "u-sam"],
      ["2025-11-16", "08:30", "Arashiyama Bamboo Grove", "Early was worth it, almost nobody there.", ME],
      ["2025-11-16", "10:30", "Tenryū-ji", "", ""],
      ["2025-11-17", "09:00", "Philosopher's Path", "Last walk. Nobody wanted to talk about the flight.", "u-mei"],
    ]),
    pastTrip("trip-lisbon", "Lisbon long weekend", "Lisbon", "2026-04-03", "mist", users.slice(0, 3), [
      ["2026-04-03", "10:00", "Alfama", "Got lost on purpose.", "u-lin"],
      ["2026-04-03", "15:00", "Tram 28", "", ""],
      ["2026-04-04", "10:00", "Pastéis de Belém", "Still warm. We went back for a second box.", "u-sam"],
      ["2026-04-04", "15:00", "LX Factory", "", ""],
      ["2026-04-05", "19:30", "Miradouro da Senhora do Monte", "Best sunset of the trip.", ME],
    ]),
  ];

  return {
    version: 1,
    lang: "en",
    me: ME,
    scene: "summer-morning",
    users,
    trips: [
      {
        id: TRIP,
        name: "Paris in April",
        destination: "Paris",
        startDate: "2027-04-12",
        endDate: "2027-04-17",
        arrivalTime: t("14:30"),
        departureTime: t("11:00"),
        groupSize: 5,
        hotelName: "Le Marais",
        hotel: { lat: 48.8592, lng: 2.3622 },
        pace: "moderate",
        inviteCode: "PARIS5",
        timeZone: "Europe/Paris",
        albumTheme: "film",
        createdBy: ME,
        createdAt: NOW,
      },
      ...past.map((p) => p.trip),
    ],
    members: [
      ...users.map((u, i): Member => ({ tripId: TRIP, userId: u.id, role: i === 0 ? "organizer" : "member", joinedAt: NOW })),
      ...past.flatMap((p) => p.members),
    ],
    places,
    sources,
    items: [...items, ...past.flatMap((p) => p.items)],
    tickets: [
      {
        id: "t-louvre",
        tripId: TRIP,
        fileName: "Louvre-ticket_2027-04-13_1000.pdf",
        name: "Louvre Museum",
        date: "2027-04-13",
        time: t("10:00"),
        endTime: t("10:30"),
        headcount: "Adult × 5",
        orderNumber: "LV-77120",
        status: "pending",
        uploadedBy: "u-lin",
        createdAt: NOW,
      },
      {
        id: "t-eiffel",
        tripId: TRIP,
        fileName: "eiffel-summit.pdf",
        name: "Eiffel Tower",
        date: "2027-04-14",
        time: t("19:00"),
        headcount: "Adult × 5",
        orderNumber: "TE-2291",
        status: "confirmed",
        itemId: "i8",
        uploadedBy: ME,
        createdAt: NOW,
      },
    ],
    photos: [],
    changeLog: [],
    notes: past.flatMap((p) => p.notes),
    todos: [
      { id: "td1", tripId: TRIP, text: "Book a restaurant for Friday night", done: false, assignee: "u-sam", createdBy: "u-sam", createdAt: NOW },
    ],
    reminders: [],
  };
}

type Stop = [date: string, time: string, title: string, note: string, noteBy: string];

/** A finished trip: every stop checked in and the album already made. */
function pastTrip(
  id: string,
  name: string,
  destination: string,
  startDate: string,
  albumTheme: string,
  users: { id: string }[],
  stops: Stop[],
): { trip: Trip; members: Member[]; items: ItineraryItem[]; notes: QuickNote[] } {
  const endDate = stops[stops.length - 1][0];
  const items = stops.map(([date, time, title], i): ItineraryItem => ({
    id: `${id}-i${i}`,
    tripId: id,
    date,
    title,
    start: t(time),
    duration: 120,
    fixed: false,
    kind: "activity",
    checkedIn: true,
    aiGenerated: false,
    createdBy: ME,
    createdAt: NOW,
  }));
  const notes = stops.flatMap(([, , , text, by], i): QuickNote[] =>
    text
      ? [{ id: `${id}-n${i}`, tripId: id, text, kind: "note", targetId: items[i].id, visibility: "group", undone: false, createdBy: by, createdAt: NOW }]
      : [],
  );
  return {
    trip: {
      id,
      name,
      destination,
      startDate,
      endDate,
      arrivalTime: t("10:00"),
      departureTime: t("18:00"),
      groupSize: users.length,
      hotelName: "",
      pace: "moderate",
      inviteCode: id.slice(5, 11).toUpperCase(),
      timeZone: "local",
      albumTheme,
      albumGeneratedAt: NOW,
      createdBy: ME,
      createdAt: NOW,
    },
    members: users.map((u, i) => ({ tripId: id, userId: u.id, role: i === 0 ? "organizer" : "member", joinedAt: NOW })),
    items,
    notes,
  };
}
