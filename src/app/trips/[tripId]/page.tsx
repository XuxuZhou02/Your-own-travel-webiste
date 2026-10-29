"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { AiChip, Sheet, UserName } from "@/components/ui";
import { nearbyPlaces } from "@/lib/geo";
import { checkIn, commit, dayItems, regenerateSkeleton, tripDays, uid, undoChange } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate, formatTime, parseTime } from "@/lib/time";
import type { ItineraryItem } from "@/lib/types";

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { state, act, t, tr } = useStore();
  const trip = state.trips.find((x) => x.id === tripId)!;
  const [showLog, setShowLog] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const log = state.changeLog.filter((e) => e.tripId === tripId);
  const proposals = state.notes.filter((n) => n.tripId === tripId && n.kind === "itinerary-change" && !n.undone);
  const todos = state.todos.filter((x) => x.tripId === tripId);
  const members = state.members.filter((m) => m.tripId === tripId);
  const pool = state.places.filter((p) => p.tripId === tripId);
  const hasDrafts = state.items.some((i) => i.tripId === tripId && i.aiGenerated);

  const swap = (a: ItineraryItem, b: ItineraryItem) => {
    if (a.fixed || b.fixed) return;
    // Keep each item's duration; the earlier slot's start goes to whichever comes first.
    const first = { ...b, start: a.start, aiGenerated: false };
    const second = { ...a, start: a.start + b.duration + Math.max(0, b.start - (a.start + a.duration)), aiGenerated: false };
    act((s) => commit(s, tripId, [first, second], { en: `Swapped ${a.title} and ${b.title}`, zh: `调换了 ${a.title} 和 ${b.title}` }, "manual"));
  };

  return (
    <main className="page stack">
      <div className="stack" style={{ gap: 6 }}>
        <div className="spread">
          <h1>{trip.name}</h1>
          <button className="btn-small" onClick={() => setShowLog(true)}>
            ↺ {t("changeLog")}
            {log.length ? ` · ${log.length}` : ""}
          </button>
        </div>
        <p className="muted small">
          {trip.destination} · {formatDate(trip.startDate, state.lang)} – {formatDate(trip.endDate, state.lang)}
          {trip.hotelName ? ` · ${trip.hotelName}` : ""}
        </p>
        <div className="row wrap small">
          <span className="muted">{t("members")}:</span>
          {members.map((m) => (
            <span key={m.userId} className="chip">
              <UserName id={m.userId} />
              {m.role === "organizer" ? " ★" : ""}
            </span>
          ))}
          <span className="chip accent">
            {t("inviteLink")}: {trip.inviteCode}
          </span>
        </div>
      </div>

      {proposals.length > 0 && (
        <div className="banner ai stack" style={{ gap: 6 }}>
          <b>✦ {t("proposed")}</b>
          {proposals.map((n) => (
            <div key={n.id} className="spread small">
              <span>
                “{n.text}” · <UserName id={n.createdBy} />
              </span>
              <button className="btn-small" onClick={() => act((s) => void (s.notes.find((x) => x.id === n.id)!.undone = true))}>
                ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {todos.length > 0 && (
        <details className="card tight">
          <summary className="small">
            ☐ {t("todos")} · {todos.filter((x) => !x.done).length}
          </summary>
          <div className="stack" style={{ gap: 4, marginTop: 8 }}>
            {todos.map((td) => (
              <label key={td.id} className="row small">
                <input
                  type="checkbox"
                  style={{ width: 18, minHeight: 18 }}
                  checked={td.done}
                  onChange={() => act((s) => void (s.todos.find((x) => x.id === td.id)!.done = !td.done))}
                />
                <span className="grow" style={{ textDecoration: td.done ? "line-through" : undefined }}>{td.text}</span>
                {td.assignee && <span className="chip"><UserName id={td.assignee} /></span>}
              </label>
            ))}
          </div>
        </details>
      )}

      {hasDrafts && (
        <div className="spread small muted">
          <span>✦ {state.lang === "zh" ? "带 AI 标签的是草稿，改过之后标签会消失。" : "Items tagged AI are drafts; the tag goes away once you edit them."}</span>
          <button
            className="btn-small"
            onClick={() => confirm(state.lang === "zh" ? "重新生成所有未改动的草稿？" : "Regenerate all untouched draft items?") && act((s) => regenerateSkeleton(s, tripId))}
          >
            ✦ ↻
          </button>
        </div>
      )}

      {tripDays(trip).map((date, dayIndex) => {
        const items = dayItems(state, tripId, date);
        return (
          <section key={date} className="stack" style={{ gap: 8 }}>
            <div className="day-head spread">
              <h2>
                {state.lang === "zh" ? `第 ${dayIndex + 1} 天` : `Day ${dayIndex + 1}`}
                <span className="muted small" style={{ fontFamily: "var(--sans)", fontWeight: 400 }}> · {formatDate(date, state.lang)}</span>
              </h2>
              <button className="btn-small" onClick={() => setAdding(date)}>+</button>
            </div>
            {items.length === 0 && <p className="muted small">{t("nothingYet")}</p>}
            <div className="timeline">
              {items.map((item, k) => {
                const next = items[k + 1];
                const prev = items[k - 1];
                const canMoveUp = prev && prev.kind === "activity" && !prev.fixed && !item.fixed;
                const tickets = state.tickets.filter((x) => x.itemId === item.id);
                const photos = state.photos.filter((x) => x.itemId === item.id && !x.hidden);
                const place = state.places.find((p) => p.id === item.placeId);
                const gap = next ? next.start - (item.start + item.duration) : 0;
                const nearby = gap >= 90 && place?.location ? nearbyPlaces(place.location, pool.filter((p) => p.status === "want"), 500, [place.id]) : [];
                return (
                  <div key={item.id}>
                    <div className="tl-item">
                      <div className="tl-time">
                        {formatTime(item.start)}
                        <small>{formatTime(item.start + item.duration)}</small>
                      </div>
                      <Link
                        href={`/trips/${tripId}/item/${item.id}`}
                        className={`card tl-card stack${item.fixed ? " fixed" : ""}${item.checkedIn ? " done" : ""}${item.kind === "marker" ? " marker" : ""}`}
                        style={{ gap: 6 }}
                      >
                        <div className="spread">
                          <h3 className="grow">{item.checkedIn ? "✓ " : ""}{item.title}</h3>
                        </div>
                        <div className="row wrap">
                          {item.aiGenerated && <AiChip />}
                          {item.fixed && <span className="chip accent">🔒 {item.fixedReason === "ticket" ? t("byTicket") : t("locked")}</span>}
                          {item.originalStart !== undefined && item.originalStart !== item.start && (
                            <span className="chip warn">
                              {t("originally")} {formatTime(item.originalStart)}
                            </span>
                          )}
                          {tickets.length > 0 && <span className="chip">🎟 {tickets.length}</span>}
                          {photos.length > 0 && <span className="chip">📷 {photos.length}</span>}
                        </div>
                        {item.kind === "activity" && (
                          <div className="row">
                            <button
                              className={`btn-small${item.checkedIn ? " btn-ok" : ""}`}
                              onClick={(e) => {
                                e.preventDefault();
                                act((s) => checkIn(s, item.id, !item.checkedIn));
                              }}
                            >
                              {item.checkedIn ? `✓ ${t("checkedIn")}` : `📍 ${t("imHere")}`}
                            </button>
                            <PhotoButton tripId={tripId} itemId={item.id} />
                            <span className="grow" />
                            {canMoveUp && (
                              <button
                                className="btn-small btn-ghost"
                                aria-label={t("earlier")}
                                onClick={(e) => {
                                  e.preventDefault();
                                  swap(prev, item);
                                }}
                              >
                                ↑
                              </button>
                            )}
                          </div>
                        )}
                      </Link>
                    </div>
                    {nearby.length > 0 && (
                      <div className="tl-gap">
                        ⋯ <Link href={`/trips/${tripId}/item/${item.id}#nearby`}>{nearby.length} {t("nearbyGap")}</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {showLog && (
        <Sheet onClose={() => setShowLog(false)}>
          <div className="stack">
            <h2>↺ {t("changeLog")}</h2>
            {log.length === 0 && <p className="muted">{t("nothingYet")}</p>}
            {log.map((e) => (
              <div key={e.id} className="card tight spread" style={{ opacity: e.undone ? 0.55 : 1 }}>
                <div className="grow stack" style={{ gap: 2 }}>
                  <span className="small">{tr(e.summary)}</span>
                  <span className="tiny muted">
                    {e.reason === "ticket" ? "🎟" : e.reason === "conflict" ? "⚠" : "✎"} <UserName id={e.by} /> · {new Date(e.at).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {e.undone ? (
                  <span className="chip">{t("undone")}</span>
                ) : (
                  <button className="btn-small" onClick={() => act((s) => undoChange(s, e.id))}>{t("undo")}</button>
                )}
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {adding && <AddItemSheet tripId={tripId} date={adding} onClose={() => setAdding(null)} />}
    </main>
  );
}

function AddItemSheet({ tripId, date, onClose }: { tripId: string; date: string; onClose: () => void }) {
  const { state, act, t } = useStore();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("10:00");
  const [duration, setDuration] = useState(90);
  const save = () => {
    act((s) =>
      commit(
        s,
        tripId,
        [
          {
            id: uid("i"),
            tripId,
            date,
            title: title.trim(),
            start: parseTime(start),
            duration,
            fixed: false,
            kind: "activity",
            checkedIn: false,
            aiGenerated: false,
            createdBy: s.me,
            createdAt: new Date().toISOString(),
          },
        ],
        { en: `Added ${title.trim()}`, zh: `添加了 ${title.trim()}` },
        "manual",
      ),
    );
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2>
          {t("addItem")} · {formatDate(date, state.lang)}
        </h2>
        <label className="field">
          <span>{t("title")}</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>{t("start")}</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>{t("duration")}</span>
            <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </label>
        </div>
        <div className="row">
          <span className="grow" />
          <button onClick={onClose}>{t("cancel")}</button>
          <button className="btn-primary" disabled={!title.trim()} onClick={save}>{t("save")}</button>
        </div>
      </div>
    </Sheet>
  );
}
