// The single AI interface layer (product plan, section 8). Business code only
// talks to `AIProvider`, so switching models or using a user's own API key
// needs no change elsewhere. AI only proposes: every result here is a draft
// that a person or a fixed rule must approve before it takes effect.

import { classifyNote, type NoteClassification } from "./notes";

export interface TicketReading {
  name?: string;
  date?: string;
  time?: number;
  endTime?: number;
  headcount?: string;
  orderNumber?: string;
  /** 0 to 1. Results are always shown as "pending" until the user confirms. */
  confidence: number;
}

export interface AIProvider {
  readonly id: string;
  classifyNote(text: string): Promise<NoteClassification>;
  readTicket(file: { name: string; type: string }): Promise<TicketReading>;
}

/**
 * Works offline with no model at all. Notes are sorted by rules; tickets are
 * read only as far as the file name allows (for example
 * "louvre-2027-04-13-1000.pdf"), and the user fills in the rest by hand.
 */
export const localProvider: AIProvider = {
  id: "local-rules",
  async classifyNote(text) {
    return classifyNote(text);
  },
  async readTicket(file) {
    return readTicketFromFileName(file.name);
  },
};

export function readTicketFromFileName(fileName: string): TicketReading {
  let rest = fileName.replace(/\.[a-z0-9]+$/i, "");
  const date = /(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/.exec(rest);
  if (date) rest = rest.replace(date[0], " ");
  rest = ` ${rest.replace(/[-_.]+/g, " ")} `;
  const time = /\s([01]\d|2[0-3])[:h]?([0-5]\d)(?=\s)/.exec(rest);
  if (time) rest = rest.replace(time[0], " ");
  const name = rest
    .replace(/(^|\s)(e?ticket|tickets?|booking)(?=\s)/gi, " ")
    .replace(/门票|票/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    name: name || undefined,
    date: date ? `${date[1]}-${date[2]}-${date[3]}` : undefined,
    time: time ? Number(time[1]) * 60 + Number(time[2]) : undefined,
    confidence: date && time && name ? 0.5 : 0.2,
  };
}

let current: AIProvider = localProvider;

export function getAI(): AIProvider {
  return current;
}

export function setAI(provider: AIProvider): void {
  current = provider;
}
