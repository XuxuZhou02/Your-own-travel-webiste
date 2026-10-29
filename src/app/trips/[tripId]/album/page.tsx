"use client";

// Automatic album (product plan, sections 4.7 and 4.9). The user picks the
// style from designed themes; AI only recommends one from the photos' mood
// and never rewrites the user's own words.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FileImage, UserName } from "@/components/ui";
import { getFile } from "@/lib/files";
import { PLATFORM_LABEL, type Platform } from "@/lib/links";
import { albumProgress, dayItems, tripDays } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate, formatTime } from "@/lib/time";
import type { Photo } from "@/lib/types";

const THEMES = [
  { id: "film", en: "Warm film", zh: "暖调胶片" },
  { id: "mist", en: "Grey-blue mist", zh: "灰蓝薄雾" },
  { id: "ink", en: "Black and white", zh: "黑白简约" },
] as const;

/** Average warmth and saturation of a few photos → a theme suggestion. */
async function suggestTheme(photos: Photo[]): Promise<string | null> {
  if (!photos.length || typeof createImageBitmap === "undefined") return null;
  let warm = 0;
  let sat = 0;
  let n = 0;
  for (const p of photos.slice(0, 8)) {
    const blob = await getFile(p.fileId);
    if (!blob) continue;
    const bmp = await createImageBitmap(blob, { resizeWidth: 24, resizeHeight: 24 });
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < d.length; i += 4) {
      warm += d[i] - d[i + 2];
      sat += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      n++;
    }
  }
  if (!n) return null;
  if (sat / n < 18) return "ink";
  return warm / n > 6 ? "film" : "mist";
}

export default function AlbumPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { state, act, t } = useStore();
  const trip = state.trips.find((x) => x.id === tripId)!;
  const { done, total } = albumProgress(state, tripId);
  const photos = state.photos.filter((p) => p.tripId === tripId);
  const visible = photos.filter((p) => !p.hidden);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(true);
  const isOrganizer = state.members.some((m) => m.tripId === tripId && m.userId === state.me && m.role === "organizer");
  const ready = !!trip.albumGeneratedAt || (total > 0 && done === total);

  const photoKey = visible.map((p) => p.id).join();
  useEffect(() => {
    suggestTheme(visible).then(setSuggested).catch(() => {});
    // Recompute only when the set of photos changes.
  }, [photoKey]);

  if (!ready) {
    return (
      <main className="page stack center" style={{ paddingTop: 40 }}>
        <h1>{t("album")}</h1>
        <p style={{ fontSize: 40, fontFamily: "var(--serif)" }}>
          {done} / {total}
        </p>
        <p className="muted">{t("checkedInOf")}</p>
        <div style={{ height: 8, background: "var(--line)", borderRadius: 99 }}>
          <div style={{ width: `${total ? (done / total) * 100 : 0}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
        </div>
        <p className="muted small">{t("albumNotReady")}</p>
        {isOrganizer && (
          <button className="btn-primary" onClick={() => act((s) => void (s.trips.find((x) => x.id === tripId)!.albumGeneratedAt = new Date().toISOString()))}>
            ✦ {t("generateAlbum")}
          </button>
        )}
      </main>
    );
  }

  const days = tripDays(trip);
  const placesVisited = state.items.filter((i) => i.tripId === tripId && i.checkedIn).length;
  const companions = state.members.filter((m) => m.tripId === tripId);

  return (
    <main className="page stack">
      <div className="no-print stack">
        <div className="spread">
          <h1>{t("album")}</h1>
          <button className="btn-small" onClick={() => window.print()}>⎙ {t("exportPdf")}</button>
        </div>
        <div className="chips">
          {THEMES.map((th) => (
            <button
              key={th.id}
              className={`chip${trip.albumTheme === th.id ? " on" : ""}`}
              onClick={() => act((s) => void (s.trips.find((x) => x.id === tripId)!.albumTheme = th.id))}
            >
              {state.lang === "zh" ? th.zh : th.en}
              {suggested === th.id ? " ✦" : ""}
            </button>
          ))}
        </div>
        {suggested && (
          <p className="tiny muted">
            ✦ {state.lang === "zh" ? "AI 根据照片色调推荐带星号的风格，用哪个由你决定。" : "AI suggests the starred theme from your photos' colors. The choice is yours."}
          </p>
        )}
        <label className="row small muted">
          <input type="checkbox" style={{ width: 18, minHeight: 18 }} checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} />
          {t("sourceLinks")}
        </label>
      </div>

      <div className={`album theme-${trip.albumTheme} stack`}>
        <section className="album-page album-cover">
          <span className="when">
            {formatDate(trip.startDate, state.lang)} – {formatDate(trip.endDate, state.lang)}
          </span>
          <h1 style={{ fontSize: 34 }}>{trip.name}</h1>
          <p>
            {companions.map((m, i) => (
              <span key={m.userId}>
                {i ? " · " : ""}
                <UserName id={m.userId} />
              </span>
            ))}
          </p>
        </section>

        {days.map((date, d) => {
          const items = dayItems(state, tripId, date).filter((i) => i.kind === "activity" && i.checkedIn);
          if (!items.length) return null;
          return (
            <div key={date} className="stack">
              <section className="album-page">
                <span className="when">{state.lang === "zh" ? `第 ${d + 1} 天` : `Day ${d + 1}`}</span>
                <h2>{formatDate(date, state.lang)}</h2>
                <p style={{ marginTop: 8 }}>{items.map((i) => i.title).join(" → ")}</p>
              </section>
              {items.map((item) => {
                const pics = visible
                  .filter((p) => p.itemId === item.id)
                  .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
                const notes = state.notes.filter(
                  (n) => !n.undone && n.visibility === "group" && (n.targetId === item.id || n.targetId === item.placeId),
                );
                const src = state.sources.find((s) => s.placeId === item.placeId);
                return (
                  <section key={item.id} className="album-page">
                    <span className="when">
                      {formatDate(date, state.lang)}, {formatTime(item.start)}
                    </span>
                    <h2>{item.title}</h2>
                    {pics.length > 0 && (
                      <div className="album-photos">
                        {pics.map((p) => (
                          <FileImage key={p.id} fileId={p.fileId} alt={item.title} />
                        ))}
                      </div>
                    )}
                    {pics.map((p) => p.note && <p key={`n${p.id}`} className="album-quote">{p.note}</p>)}
                    {notes.map((n) => (
                      <p key={n.id} className="album-quote">
                        {n.text} — <UserName id={n.createdBy} />
                      </p>
                    ))}
                    {showLinks && src && (
                      <p className="tiny" style={{ marginTop: 10, opacity: 0.7 }}>
                        {PLATFORM_LABEL[src.platform as Platform] ?? src.platform} · <UserName id={src.addedBy} />
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          );
        })}

        <section className="album-page">
          <span className="when">{t("tripStats")}</span>
          <div className="grid2" style={{ marginTop: 12, fontSize: 18 }}>
            <p><b style={{ fontSize: 30 }}>{days.length}</b> {t("days")}</p>
            <p><b style={{ fontSize: 30 }}>{placesVisited}</b> {t("placesVisited")}</p>
            <p><b style={{ fontSize: 30 }}>{visible.length}</b> {t("photoCount")}</p>
            <p><b style={{ fontSize: 30 }}>{companions.length}</b> {t("members")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
