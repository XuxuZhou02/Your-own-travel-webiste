// Rule-based quick-note classifier (product plan, section 4.8). It is the
// offline fallback behind the AI interface: every step must still work when
// the model is unavailable, so this covers the common English and Chinese
// phrasings and leaves anything unclear as a plain note.

import type { NoteKind } from "../types";

export interface NoteClassification {
  kind: NoteKind;
  /** High-risk kinds show a preview and need a tap before they are saved. */
  risk: "low" | "high";
  /** Extracted fields, when the rules found them. */
  placeName?: string;
  amount?: number;
  currency?: string;
  /** For itinerary changes and reminders: the weekday or relative day mentioned. */
  when?: string;
}

const HIGH_RISK: NoteKind[] = ["place", "itinerary-change", "expense"];

const CURRENCY: [RegExp, string][] = [
  [/€|\beur(o|os)?\b|欧元?/i, "EUR"],
  [/\$|\busd\b|\bdollars?\b|美元|美金/i, "USD"],
  [/£|\bgbp\b|\bpounds?\b|英镑/i, "GBP"],
  [/¥|\bjpy\b|\byen\b|日元/i, "JPY"],
  [/\bcny\b|\brmb\b|人民币|元|块/i, "CNY"],
];

const DAY_WORDS =
  /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]/i;

export function classifyNote(text: string): NoteClassification {
  const t = text.trim();
  const when = DAY_WORDS.exec(t)?.[0];
  const withRisk = (c: Omit<NoteClassification, "risk">): NoteClassification => ({
    ...c,
    risk: HIGH_RISK.includes(c.kind) ? "high" : "low",
  });

  if (/[?？]\s*$/.test(t) || /^(which|what|when|where|how|do we|are there)\b/i.test(t) || /哪些|哪个|几点|什么时候|有没有|吗[?？]?$/.test(t)) {
    return withRisk({ kind: "question" });
  }

  if (/\bremind me\b|提醒我?/i.test(t)) return withRisk({ kind: "reminder", when });

  const amount = /(\d+(?:[.,]\d{1,2})?)\s*(€|eur(?:o|os)?|usd|\$|dollars?|£|gbp|pounds?|¥|jpy|yen|cny|rmb|欧元?|美元|美金|英镑|日元|人民币|元|块)|(€|\$|£|¥)\s*(\d+(?:[.,]\d{1,2})?)/i.exec(t);
  if (amount && /cost|paid|spent|split|花了|付了|付|花|AA|平摊|分摊/i.test(t)) {
    const value = Number((amount[1] ?? amount[4]).replace(",", "."));
    const unit = amount[2] ?? amount[3];
    const currency = CURRENCY.find(([re]) => re.test(unit))?.[1];
    return withRisk({ kind: "expense", amount: value, currency });
  }

  if (/^(move|reschedule|swap|shift)\b|\bmove .* to\b|改到|挪到|换到|调到|移到/i.test(t)) {
    return withRisk({ kind: "itinerary-change", when });
  }

  const placeName =
    /\b(?:called|named)\s+["“]?([^,.;"”]+?)["”]?(?:\s+(?:in|at|near)\b|[,.;]|$)/i.exec(t)?.[1] ??
    /叫[「“"]?([^，。,;；」”"]+?)[」”"]?(?:的|，|。|$)/.exec(t)?.[1];
  if (placeName) return withRisk({ kind: "place", placeName: placeName.trim() });

  if (/^(book|buy|bring|pack|get|call|check|need to|we need|todo|to do)\b|要订|订一?个|预订|买|带上|记得|需要/i.test(t)) {
    return withRisk({ kind: "todo", when });
  }

  return withRisk({ kind: "note" });
}
