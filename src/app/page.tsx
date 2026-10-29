"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/ui";
import { clearFiles } from "@/lib/files";
import { albumProgress, joinTrip } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/time";

export default function MyTrips() {
  const { state, act, reset, t } = useStore();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const mine = state.trips
    .filter((trip) => state.members.some((m) => m.tripId === trip.id && m.userId === state.me))
    .sort((a, b) => {
      const live = (x: typeof a) => (x.startDate <= today && today <= x.endDate ? 0 : 1);
      return live(a) - live(b) || a.startDate.localeCompare(b.startDate);
    });

  const join = () => {
    const id = act((s) => joinTrip(s, code));
    if (id) router.push(`/trips/${id}`);
    else setError(true);
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Footnote<small>行迹</small></span>
          <span className="grow" />
          <LangToggle />
        </div>
      </header>
      <main className="page stack">
        <div className="stack" style={{ gap: 4, padding: "12px 0 4px" }}>
          <h1>{t("myTrips")}</h1>
          <p className="muted">{t("appTagline")}</p>
        </div>

        {mine.map((trip) => {
          const live = trip.startDate <= today && today <= trip.endDate;
          const { done, total } = albumProgress(state, trip.id);
          const members = state.members.filter((m) => m.tripId === trip.id).length;
          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="card tl-card stack" style={{ gap: 6 }}>
              <div className="spread">
                <h2>{trip.name}</h2>
                {live && <span className="chip accent">{t("current")}</span>}
              </div>
              <p className="muted small">
                {trip.destination} · {formatDate(trip.startDate, state.lang)} – {formatDate(trip.endDate, state.lang)}
              </p>
              <div className="row small muted">
                <span>👥 {members}</span>
                <span>· 📍 {done}/{total} {t("checkedInOf")}</span>
                <span>· {t("inviteLink")} <b>{trip.inviteCode}</b></span>
              </div>
            </Link>
          );
        })}

        <Link href="/trips/new" className="btn btn-primary btn-block">+ {t("newTrip")}</Link>

        <div className="card stack">
          <h3>{t("joinTrip")}</h3>
          <div className="row">
            <input
              value={code}
              placeholder="PARIS5"
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
            />
            <button onClick={join} disabled={!code.trim()}>{t("join")}</button>
          </div>
          {error && <p className="small" style={{ color: "var(--danger)" }}>{state.lang === "zh" ? "没有找到这个邀请码。" : "No trip with that code."}</p>}
        </div>

        <p className="tiny muted center" style={{ marginTop: 20 }}>
          {state.lang === "zh"
            ? "原型版：数据只保存在这台设备的浏览器里。"
            : "Prototype: data is stored only in this browser on this device."}{" "}
          <button
            className="btn-small btn-ghost"
            onClick={() => {
              if (confirm(t("resetDemo") + "?")) {
                clearFiles().catch(() => {});
                reset();
              }
            }}
          >
            {t("resetDemo")}
          </button>
        </p>
      </main>
    </>
  );
}
