"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/ui";
import { createTrip } from "@/lib/state";
import { useStore } from "@/lib/store";
import { addDays, parseTime } from "@/lib/time";
import type { Pace } from "@/lib/types";

export default function NewTrip() {
  const { state, act, t } = useStore();
  const router = useRouter();
  const start = addDays(new Date().toISOString().slice(0, 10), 35);
  const [f, setF] = useState({
    name: "",
    destination: "",
    startDate: start,
    endDate: addDays(start, 4),
    arrival: "14:00",
    departure: "17:00",
    groupSize: 4,
    hotelName: "",
    pace: "moderate" as Pace,
    mustSee: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const valid = f.destination.trim() && f.startDate && f.endDate >= f.startDate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const id = act((s) =>
      createTrip(s, {
        name: f.name.trim() || f.destination.trim(),
        destination: f.destination.trim(),
        startDate: f.startDate,
        endDate: f.endDate,
        arrivalTime: parseTime(f.arrival),
        departureTime: parseTime(f.departure),
        groupSize: f.groupSize,
        hotelName: f.hotelName.trim(),
        pace: f.pace,
        mustSee: f.mustSee.split("\n").map((x) => x.trim()).filter(Boolean),
      }),
    );
    router.push(`/trips/${id}`);
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">Footnote<small>行迹</small></Link>
          <span className="grow" />
          <LangToggle />
        </div>
      </header>
      <form className="page stack" onSubmit={submit}>
        <h1>{t("newTrip")}</h1>
        <label className="field">
          <span>{t("destination")} *</span>
          <input required value={f.destination} placeholder="Paris" onChange={(e) => set("destination", e.target.value)} />
        </label>
        <label className="field">
          <span>{t("tripName")}</span>
          <input value={f.name} placeholder={f.destination || "Paris in April"} onChange={(e) => set("name", e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>{t("startDate")}</span>
            <input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label className="field">
            <span>{t("endDate")}</span>
            <input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
          <label className="field">
            <span>{t("arrival")}</span>
            <input type="time" value={f.arrival} onChange={(e) => set("arrival", e.target.value)} />
          </label>
          <label className="field">
            <span>{t("departure")}</span>
            <input type="time" value={f.departure} onChange={(e) => set("departure", e.target.value)} />
          </label>
          <label className="field">
            <span>{t("groupSize")}</span>
            <input type="number" min={1} max={20} value={f.groupSize} onChange={(e) => set("groupSize", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>{t("hotel")}</span>
            <input value={f.hotelName} placeholder="Le Marais" onChange={(e) => set("hotelName", e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span className="small muted">{t("pace")}</span>
          <div className="chips">
            {(["relaxed", "moderate", "packed"] as Pace[]).map((p) => (
              <button type="button" key={p} className={`chip${f.pace === p ? " on" : ""}`} onClick={() => set("pace", p)}>
                {t(p)} · {p === "relaxed" ? 2 : p === "moderate" ? 3 : 4}/{state.lang === "zh" ? "天" : "day"}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>{t("mustSee")}</span>
          <textarea value={f.mustSee} placeholder={"Louvre\nEiffel Tower"} onChange={(e) => set("mustSee", e.target.value)} />
        </label>
        <button className="btn-primary btn-block" disabled={!valid}>✦ {t("generate")}</button>
        <p className="tiny muted center">
          {state.lang === "zh"
            ? "生成的是草稿：每一项都可以拖动、删除或改时间，也可以整体重新生成。"
            : "This is only a draft: every item can be moved, deleted or re-timed, or the whole thing regenerated."}
        </p>
      </form>
    </>
  );
}
