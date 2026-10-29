// Source links (product plan, section 4.2). Footnote saves only links users
// share themselves; it never scrapes post text or images.

export type Platform =
  | "xiaohongshu"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "googlemaps"
  | "web";

const PATTERNS: [Platform, RegExp][] = [
  ["xiaohongshu", /(^|\.)(xiaohongshu\.com|xhslink\.com)$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["tiktok", /(^|\.)(tiktok\.com|douyin\.com)$/],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["googlemaps", /(^|\.)(maps\.app\.goo\.gl|goo\.gl)$|^(www\.)?google\.[a-z.]+$/],
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  xiaohongshu: "小红书",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  googlemaps: "Google Maps",
  web: "Web",
};

/** Returns the normalized URL, or null when the text is not an http(s) link. */
export function normalizeUrl(text: string): string | null {
  const match = /https?:\/\/[^\s，。]+/i.exec(text.trim());
  if (!match) return null;
  try {
    return new URL(match[0]).toString();
  } catch {
    return null;
  }
}

export function detectPlatform(url: string): Platform {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "web";
  }
  if (host.startsWith("google.") || host.includes(".google.")) {
    return new URL(url).pathname.startsWith("/maps") ? "googlemaps" : "web";
  }
  for (const [platform, re] of PATTERNS) if (re.test(host)) return platform;
  return "web";
}
