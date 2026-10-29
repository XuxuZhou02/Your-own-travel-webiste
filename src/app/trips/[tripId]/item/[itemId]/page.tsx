"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { AiChip, FileImage, UserName } from "@/components/ui";
import { nearbyPlaces } from "@/lib/geo";
import { PLATFORM_LABEL, type Platform } from "@/lib/links";
import { checkIn, deleteItem, schedulePlace, setLocked, updateItem } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate, formatTime, parseTime } from "@/lib/time";

export default function ItemDetail() {
  const { tripId, itemId } = useParams<{ tripId: string; itemId: string }>();
  const { state, act, t } = useStore();
  const router = useRouter();
  const item = state.items.find((i) => i.id === itemId);
  const [editing, setEditing] = useState(false);
  const [radius, setRadius] = useState(500);
  const [form, setForm] = useState({ title: "", start: "", duration: 0 });
  const [notice, setNotice] = useState<string | null>(null);

  if (!item) {
    return (
      <main className="page stack">
        <p className="muted">{t("nothingYet")}</p>
        <Link href={`/trips/${tripId}`}>← {t("itinerary")}</Link>
      </main>
    );
  }

  const place = state.places.find((p) => p.id === item.placeId);
  const sources = state.sources.filter((s) => s.placeId === item.placeId);
  const tickets = state.tickets.filter((x) => x.itemId === item.id);
  const photos = state.photos.filter((x) => x.itemId === item.id);
  const notes = state.notes.filter(
    (n) => !n.undone && (n.targetId === item.id || (place && n.targetId === place.id)) && (n.visibility === "group" || n.createdBy === state.me),
  );
  const pool = state.places.filter((p) => p.tripId === tripId);
  const nearby = place?.location ? nearbyPlaces(place.location, pool, radius, [place.id]) : [];
  const loc = place?.location;

  const startEdit = () => {
    setForm({ title: item.title, start: formatTime(item.start), duration: item.duration });
    setEditing(true);
  };
  const saveEdit = () => {
    act((s) =>
      updateItem(s, item.id, {
        title: form.title.trim() || item.title,
        duration: form.duration,
        ...(item.fixed ? {} : { start: parseTime(form.start) }),
      }),
    );
    setEditing(false);
  };

  return (
    <main className="page stack">
      <Link href={`/trips/${tripId}`} className="small muted">← {t("itinerary")}</Link>

      <div className="stack" style={{ gap: 6 }}>
        <h1>{item.title}</h1>
        <p className="muted">
          {formatDate(item.date, state.lang)} · {formatTime(item.start)}–{formatTime(item.start + item.duration)}
        </p>
        <div className="row wrap">
          {item.aiGenerated && <AiChip />}
          {item.fixed && <span className="chip accent">🔒 {item.fixedReason === "ticket" ? t("byTicket") : t("locked")}</span>}
          {item.originalStart !== undefined && item.originalStart !== item.start && (
            <span className="chip warn">
              {state.lang === "zh"
                ? `原定 ${formatTime(item.originalStart)}，已按票调整`
                : `Originally ${formatTime(item.originalStart)}, adjusted to match the ticket`}
            </span>
          )}
        </div>
      </div>

      {loc && (
        <iframe
          title="map"
          style={{ width: "100%", height: 170, border: 0, borderRadius: 14 }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.006},${loc.lat - 0.003},${loc.lng + 0.006},${loc.lat + 0.003}&layer=mapnik&marker=${loc.lat},${loc.lng}`}
        />
      )}

      {item.kind === "activity" && (
        <div className="row wrap">
          <button className={item.checkedIn ? "btn-ok" : "btn-primary"} onClick={() => act((s) => checkIn(s, item.id, !item.checkedIn))}>
            {item.checkedIn ? `✓ ${t("checkedIn")}` : `📍 ${t("imHere")}`}
          </button>
          <PhotoButton tripId={tripId} itemId={item.id} label={t("addPhotos")} />
        </div>
      )}

      <div className="card stack">
        {!editing ? (
          <div className="row wrap">
            <button className="btn-small" onClick={startEdit}>✎ {t("edit")}</button>
            {item.fixed ? (
              <button
                className="btn-small"
                onClick={() =>
                  confirm(state.lang === "zh" ? "解锁后其他调整可能会移动它。确定？" : "Once unlocked, other changes may move it. Unlock?") &&
                  act((s) => setLocked(s, item.id, false))
                }
              >
                🔓 {t("unlock")}
              </button>
            ) : (
              <button className="btn-small" onClick={() => act((s) => setLocked(s, item.id, true))}>🔒 {t("locked")}</button>
            )}
            <span className="grow" />
            <button
              className="btn-small btn-ghost"
              style={{ color: "var(--danger)" }}
              onClick={() => {
                if (!confirm(`${t("delete")}?`)) return;
                act((s) => deleteItem(s, item.id));
                router.push(`/trips/${tripId}`);
              }}
            >
              {t("delete")}
            </button>
          </div>
        ) : (
          <div className="stack">
            <label className="field">
              <span>{t("title")}</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <div className="grid2">
              <label className="field">
                <span>{t("start")}{item.fixed ? " 🔒" : ""}</span>
                <input type="time" disabled={item.fixed} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </label>
              <label className="field">
                <span>{t("duration")}</span>
                <input type="number" min={15} step={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row">
              <span className="grow" />
              <button onClick={() => setEditing(false)}>{t("cancel")}</button>
              <button className="btn-primary" onClick={saveEdit}>{t("save")}</button>
            </div>
          </div>
        )}
        {notes.map((n) => (
          <p key={n.id} className="small">
            ✎ {n.text} <span className="muted tiny">· <UserName id={n.createdBy} /> {n.visibility === "private" ? "🔒" : ""}</span>
          </p>
        ))}
        {place?.note && <p className="small">✎ {place.note}</p>}
      </div>

      <details open className="card">
        <summary><b>{t("sourceLinks")}</b> · {sources.length}</summary>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          {sources.length === 0 && <p className="muted small">{t("nothingYet")}</p>}
          {sources.map((src) => (
            <a key={src.id} href={src.url} target="_blank" rel="noreferrer" className="row small" style={{ textDecoration: "none" }}>
              <span className="chip">{PLATFORM_LABEL[src.platform as Platform] ?? src.platform}</span>
              <span className="grow ellipsis">{src.title ?? src.url}</span>
              <span className="muted tiny"><UserName id={src.addedBy} /> ↗</span>
            </a>
          ))}
          {sources.filter((x) => x.reason).map((x) => (
            <p key={`r${x.id}`} className="small muted">“{x.reason}” · <UserName id={x.addedBy} /></p>
          ))}
        </div>
      </details>

      <details open className="card" id="nearby">
        <summary><b>{t("nearbyPlaces")}</b> · {nearby.length}</summary>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          {!loc ? (
            <p className="muted small">{t("noLocation")}</p>
          ) : (
            <div className="chips">
              {[300, 500, 1000].map((r) => (
                <button key={r} className={`chip${radius === r ? " on" : ""}`} onClick={() => setRadius(r)}>
                  {r < 1000 ? `${r} m` : "1 km"}
                </button>
              ))}
            </div>
          )}
          {nearby.map(({ place: p, meters, walkMinutes }) => {
            const src = state.sources.find((x) => x.placeId === p.id);
            return (
              <div key={p.id} className="row small">
                <div className="grow stack" style={{ gap: 0 }}>
                  <span className="ellipsis">{p.name}</span>
                  <span className="tiny muted">
                    {Math.round(meters)} m · {walkMinutes} {t("walk")} · ♥ {p.likes.length} · <UserName id={p.addedBy} />
                    {src && (
                      <>
                        {" · "}
                        <a href={src.url} target="_blank" rel="noreferrer">{PLATFORM_LABEL[src.platform as Platform] ?? "↗"}</a>
                      </>
                    )}
                  </span>
                </div>
                {p.status === "want" ? (
                  <button
                    className="btn-small"
                    onClick={() => {
                      const start = act((s) => schedulePlace(s, p.id, item.date, 60));
                      setNotice(start === null ? (state.lang === "zh" ? "今天排满了。" : "Today is full.") : `${p.name} → ${formatTime(start)}`);
                    }}
                  >
                    + {t("addToday")}
                  </button>
                ) : (
                  <span className="chip">{t(p.status)}</span>
                )}
              </div>
            );
          })}
          {notice && <p className="banner ok small">{notice}</p>}
        </div>
      </details>

      <details open className="card">
        <summary><b>{t("tickets")}</b> · {tickets.length}</summary>
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {tickets.length === 0 && <p className="muted small">{t("nothingYet")}</p>}
          {tickets.map((x) => (
            <Link key={x.id} href={`/trips/${tripId}/tickets#${x.id}`} className="row small" style={{ textDecoration: "none" }}>
              🎟 <span className="grow">{x.name}{x.time !== undefined ? ` · ${formatTime(x.time)}` : ""} · {x.headcount ?? ""}</span>
              <span className={`chip ${x.status === "confirmed" ? "ok" : "warn"}`}>{t(x.status)}</span>
            </Link>
          ))}
        </div>
      </details>

      <details open className="card">
        <summary><b>{t("photos")}</b> · {photos.length}</summary>
        <div className="thumbs" style={{ marginTop: 8 }}>
          {photos.map((p) => (
            <button
              key={p.id}
              className="btn-ghost"
              style={{ padding: 0, position: "relative", opacity: p.hidden ? 0.35 : 1 }}
              title={p.hidden ? t("show") : t("hide")}
              onClick={() => act((s) => void (s.photos.find((x) => x.id === p.id)!.hidden = !p.hidden))}
            >
              <FileImage fileId={p.fileId} alt={item.title} />
            </button>
          ))}
        </div>
        {photos.length === 0 && <p className="muted small" style={{ marginTop: 6 }}>{t("nothingYet")}</p>}
      </details>
    </main>
  );
}
