"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { UserName } from "@/components/ui";
import { detectPlatform, normalizeUrl, PLATFORM_LABEL, type Platform } from "@/lib/links";
import { addPlace, schedulePlace, setPlaceStatus, toggleLike, tripDays } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/time";
import type { LatLng, PlaceCategory, PlaceStatus } from "@/lib/types";

const CATEGORIES: PlaceCategory[] = ["sight", "restaurant", "cafe", "shopping", "other"];
const STATUSES: PlaceStatus[] = ["want", "scheduled", "visited", "dropped"];
const ICON: Record<PlaceCategory, string> = { sight: "🏛", restaurant: "🍽", cafe: "☕", shopping: "🛍", other: "📍" };

function parseLatLng(text: string): LatLng | undefined {
  const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(text);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
}

export default function PlacesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { state, act, t } = useStore();
  const trip = state.trips.find((x) => x.id === tripId)!;
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("sight");
  const [reason, setReason] = useState("");
  const [coords, setCoords] = useState("");
  const [filter, setFilter] = useState<PlaceCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PlaceStatus | "all">("all");
  const [message, setMessage] = useState<string | null>(null);

  const url = normalizeUrl(link);
  // Coordinates can often be read straight from a Google Maps link.
  const linkCoords = url ? parseLatLng(/@(-?\d+\.\d+,-?\d+\.\d+)/.exec(url)?.[1] ?? "") : undefined;

  const places = state.places
    .filter((p) => p.tripId === tripId)
    .filter((p) => filter === "all" || p.category === filter)
    .filter((p) => (statusFilter === "all" ? p.status !== "dropped" : p.status === statusFilter))
    .sort((a, b) => b.likes.length - a.likes.length);

  const submit = () => {
    const r = act((s) =>
      addPlace(s, tripId, {
        name,
        category,
        link: url ?? undefined,
        reason: reason.trim() || undefined,
        location: parseLatLng(coords) ?? linkCoords,
      }),
    );
    setMessage(r.merged ? t("mergedSource") : `✓ ${name}`);
    setLink("");
    setName("");
    setReason("");
    setCoords("");
  };

  return (
    <main className="page stack">
      <h1>{t("places")}</h1>

      <div className="card stack">
        <input value={link} placeholder={t("pasteLink")} onChange={(e) => setLink(e.target.value)} />
        {url && (
          <p className="small muted">
            <span className="chip">{PLATFORM_LABEL[detectPlatform(url)]}</span>{" "}
            {state.lang === "zh"
              ? "只保存链接和你的备注，点开会回到原帖。请补上地点名称。"
              : "Only the link and your notes are saved; tapping it opens the original post. Add the place name below."}
          </p>
        )}
        <input value={name} placeholder={`${t("placeName")} *`} onChange={(e) => setName(e.target.value)} />
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip${category === c ? " on" : ""}`} onClick={() => setCategory(c)}>
              {ICON[c]} {t(c)}
            </button>
          ))}
        </div>
        <input value={reason} placeholder={t("why")} onChange={(e) => setReason(e.target.value)} />
        <input value={coords} placeholder={linkCoords ? `${linkCoords.lat}, ${linkCoords.lng}` : t("latLng")} onChange={(e) => setCoords(e.target.value)} />
        <button className="btn-primary" disabled={!name.trim()} onClick={submit}>+ {t("addPlace")}</button>
        {message && <p className="banner ok small">{message}</p>}
      </div>

      <div className="chips">
        <button className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>{t("all")}</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>
            {ICON[c]} {t(c)}
          </button>
        ))}
      </div>
      <div className="chips">
        <button className={`chip${statusFilter === "all" ? " on" : ""}`} onClick={() => setStatusFilter("all")}>{t("all")}</button>
        {STATUSES.map((st) => (
          <button key={st} className={`chip${statusFilter === st ? " on" : ""}`} onClick={() => setStatusFilter(st)}>
            {t(st)}
          </button>
        ))}
      </div>

      {places.length === 0 && <p className="muted center" style={{ padding: 20 }}>{t("emptyPool")}</p>}

      {places.map((p) => {
        const sources = state.sources.filter((s) => s.placeId === p.id);
        const liked = p.likes.includes(state.me);
        return (
          <div key={p.id} className="card stack" style={{ gap: 8 }}>
            <div className="spread">
              <h3 className="grow">{ICON[p.category]} {p.name}</h3>
              <button className={`btn-small${liked ? " btn-primary" : ""}`} onClick={() => act((s) => toggleLike(s, p.id))}>
                ♥ {p.likes.length}
              </button>
            </div>
            <p className="tiny muted">
              {t("recommendedBy")} <UserName id={p.addedBy} />
              {!p.location && ` · ${t("noLocation")}`}
            </p>
            {(sources.some((s) => s.reason) || p.note) && (
              <p className="small">“{sources.find((s) => s.reason)?.reason ?? p.note}”</p>
            )}
            {sources.length > 0 && (
              <div className="row wrap">
                {sources.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="chip" style={{ textDecoration: "none" }}>
                    {PLATFORM_LABEL[s.platform as Platform] ?? s.platform} ↗
                  </a>
                ))}
              </div>
            )}
            <div className="row">
              <select value={p.status} style={{ width: "auto" }} onChange={(e) => act((s) => setPlaceStatus(s, p.id, e.target.value as PlaceStatus))}>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{t(st)}</option>
                ))}
              </select>
              {p.status === "want" && (
                <select
                  value=""
                  style={{ width: "auto" }}
                  onChange={(e) => {
                    const date = e.target.value;
                    const start = act((s) => schedulePlace(s, p.id, date));
                    setMessage(start === null ? (state.lang === "zh" ? "那天排满了。" : "That day is full.") : `${p.name} → ${formatDate(date, state.lang)} ${formatTime(start)}`);
                  }}
                >
                  <option value="">{t("scheduleOn")}</option>
                  {tripDays(trip).map((d) => (
                    <option key={d} value={d}>{formatDate(d, state.lang)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </main>
  );
}
