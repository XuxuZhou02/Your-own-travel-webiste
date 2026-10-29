"use client";

// Memory space (product plan, section 4.9): the user's own cozy scene, with
// every finished trip album standing on the shelf.

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui";
import { getScene, SCENES, THEME_SPINE, type Rect, type Scene, type SceneEffect } from "@/lib/scenes";
import { albumProgress, albumReady } from "@/lib/state";
import { useStore } from "@/lib/store";

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Animation length per effect: [shortest, extra random spread] in seconds. */
const DURATION: Record<SceneEffect, [number, number]> = {
  rain: [0.6, 0.5],
  snow: [7, 6],
  leaves: [6, 4],
  stars: [3, 4],
  sun: [3, 4],
};

const pct = (r: Rect) => ({ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` });

/** Light motion layered over the illustration: rain, snow, sunlight, leaves or stars. */
function Effects({ scene }: { scene: Scene }) {
  const particles = useMemo(() => {
    const r = rng(scene.id.length * 7919);
    const count = { rain: 46, snow: 40, sun: 14, leaves: 12, stars: 12 }[scene.effect];
    return Array.from({ length: count }, () => ({
      x: r() * 100,
      y: r() * 100,
      size: r(),
      delay: -r() * 10,
      dur: r(),
    }));
  }, [scene]);

  return (
    <>
      {scene.glows.map((g, i) => (
        <div
          key={i}
          className={`fx-glow${g.flicker ? " flicker" : ""}`}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.size}%`,
            background: `radial-gradient(circle, rgba(${g.color}, .55) 0%, rgba(${g.color}, .18) 40%, rgba(${g.color}, 0) 70%)`,
          }}
        />
      ))}
      {scene.areas.map((area, a) => (
        <div key={a} className={`fx fx-${scene.effect}`} style={pct(area)} aria-hidden>
          {particles
            .filter((_, i) => i % scene.areas.length === a)
            .map((p, i) => (
              <i
                key={i}
                style={{
                  left: `${p.x}%`,
                  top: scene.effect === "stars" || scene.effect === "sun" ? `${p.y}%` : undefined,
                  animationDelay: `${p.delay.toFixed(2)}s`,
                  animationDuration: `${(DURATION[scene.effect][0] + p.dur * DURATION[scene.effect][1]).toFixed(2)}s`,
                  ["--s" as string]: p.size.toFixed(2),
                }}
              />
            ))}
        </div>
      ))}
    </>
  );
}

export default function MemorySpace() {
  const { state, act } = useStore();
  const [picking, setPicking] = useState(false);
  const scene = getScene(state.scene);

  const mine = state.trips.filter((trip) => state.members.some((m) => m.tripId === trip.id && m.userId === state.me));
  const shelf = mine
    .map((trip) => ({ trip, progress: albumProgress(state, trip.id), done: albumReady(state, trip) }))
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
  const finished = shelf.filter((x) => x.done).length;

  return (
    <div className="space">
      <img className="space-blur" src={scene.src} alt="" aria-hidden />
      <div className="space-stage">
        <img className="space-scene" src={scene.src} alt={`${scene.name}: ${scene.mood}`} />
        <Effects scene={scene} />

        <div className="space-top">
          <Link href="/" className="space-pill">← Trips</Link>
          <button className="space-pill" onClick={() => setPicking(true)}>✦ {scene.name}</button>
        </div>

        <div className="space-shelf">
          <div className="spread" style={{ alignItems: "baseline" }}>
            <h3>My albums</h3>
            <span className="tiny muted">
              {finished} on the shelf{shelf.length > finished ? ` · ${shelf.length - finished} in progress` : ""}
            </span>
          </div>
          <div className="spines">
            {shelf.length === 0 && <p className="small muted">Albums appear here when a trip is checked in.</p>}
            {shelf.map(({ trip, progress, done }) => {
              const days = Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 864e5) + 1;
              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}/album`}
                  className={`spine${done ? "" : " ghost"}`}
                  style={{
                    height: `${Math.min(118, 84 + days * 6)}px`,
                    ["--spine" as string]: THEME_SPINE[trip.albumTheme] ?? THEME_SPINE.film,
                  }}
                  title={done ? `${trip.name} — open the album` : `${trip.name} — ${progress.done}/${progress.total} checked in`}
                >
                  <span className="spine-title">{trip.destination}</span>
                  <span className="spine-year">{done ? trip.startDate.slice(2, 4) : `${progress.done}/${progress.total}`}</span>
                </Link>
              );
            })}
          </div>
          <div className="ledge" />
        </div>
      </div>

      {picking && (
        <Sheet onClose={() => setPicking(false)}>
          <div className="stack">
            <h2>Choose your space</h2>
            <p className="small muted">Pick the scene you want to come back to. You can change it any time.</p>
            <div className="scene-grid">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  className={`scene-option${s.id === scene.id ? " on" : ""}`}
                  onClick={() => {
                    act((d) => void (d.scene = s.id));
                    setPicking(false);
                  }}
                >
                  <img src={s.src} alt="" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
