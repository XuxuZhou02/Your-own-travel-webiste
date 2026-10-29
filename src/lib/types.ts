// Data model (product plan, section 7). Every object records its creator and
// time so changes can be traced. Times of day are minutes since midnight in
// the destination's time zone; dates are ISO "YYYY-MM-DD" strings.

export type Lang = "en" | "zh";
export type Bilingual = Record<Lang, string>;

export type Pace = "relaxed" | "moderate" | "packed";
export type Role = "organizer" | "member";
export type PlaceCategory = "sight" | "restaurant" | "cafe" | "shopping" | "other";
export type PlaceStatus = "want" | "scheduled" | "visited" | "dropped";
export type TicketStatus = "pending" | "confirmed";
export type ChangeReason = "ticket" | "manual" | "conflict";
export type Visibility = "private" | "group";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
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
  inviteCode: string;
  timeZone: string;
  albumTheme: string;
  albumGeneratedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface Member {
  tripId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}

export interface Source {
  id: string;
  placeId: string;
  platform: string;
  url: string;
  title?: string;
  reason?: string;
  addedBy: string;
  createdAt: string;
}

export interface Place {
  id: string;
  tripId: string;
  name: string;
  location?: LatLng;
  category: PlaceCategory;
  status: PlaceStatus;
  likes: string[];
  note?: string;
  addedBy: string;
  createdAt: string;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  title: string;
  placeId?: string;
  start: number;
  duration: number;
  fixed: boolean;
  fixedReason?: "ticket" | "manual";
  /** Set when a ticket moved the item, e.g. "Originally 9:00". */
  originalStart?: number;
  /** "marker" is a non-activity entry such as hotel check-in. */
  kind: "activity" | "marker";
  checkedIn: boolean;
  /** The "AI generated" label disappears once a user edits the item. */
  aiGenerated: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  tripId: string;
  fileId?: string;
  fileName?: string;
  name: string;
  date?: string;
  time?: number;
  endTime?: number;
  headcount?: string;
  orderNumber?: string;
  status: TicketStatus;
  itemId?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  fileId: string;
  itemId?: string;
  takenAt: string;
  note?: string;
  hidden: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface ChangeLogEntry {
  id: string;
  tripId: string;
  summary: Bilingual;
  reason: ChangeReason;
  before: ItineraryItem[];
  after: ItineraryItem[];
  undone: boolean;
  by: string;
  at: string;
}

export type NoteKind =
  | "note"
  | "todo"
  | "place"
  | "reminder"
  | "itinerary-change"
  | "expense"
  | "question";

export interface QuickNote {
  id: string;
  tripId: string;
  /** The original words are always kept. */
  text: string;
  kind: NoteKind;
  targetId?: string;
  visibility: Visibility;
  undone: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  tripId: string;
  text: string;
  done: boolean;
  assignee?: string;
  createdBy: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  tripId: string;
  text: string;
  at?: string;
  createdBy: string;
  createdAt: string;
}
