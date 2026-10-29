"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import type { MsgKey } from "@/lib/i18n";
import { LangToggle } from "./ui";
import { QuickNote } from "./QuickNote";

const ICONS: Record<string, ReactNode> = {
  trips: <path d="M4 7h16M4 12h16M4 17h10" />,
  itinerary: <path d="M7 4v16M7 6h11l-2 3 2 3H7" />,
  places: <path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  tickets: <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4v4Zm9-4v12" transform="translate(0 2)" />,
  album: <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 14a2 2 0 0 1 2-2h12M9 8h6" />,
};

export function TripShell({ tripId, children }: { tripId: string; children: ReactNode }) {
  const { state, t } = useStore();
  const path = usePathname();
  const trip = state.trips.find((x) => x.id === tripId);
  const base = `/trips/${tripId}`;

  if (!trip) {
    return (
      <div className="page stack center">
        <h2>Trip not found · 找不到这个行程</h2>
        <Link className="btn" href="/">← {t("myTrips")}</Link>
      </div>
    );
  }

  const tabs: [string, MsgKey, string][] = [
    ["trips", "trips", "/"],
    ["itinerary", "itinerary", base],
    ["places", "places", `${base}/places`],
    ["tickets", "tickets", `${base}/tickets`],
    ["album", "album", `${base}/album`],
  ];
  const pendingTickets = state.tickets.filter((x) => x.tripId === tripId && x.status === "pending").length;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">Footnote<small>行迹</small></Link>
          <span className="grow ellipsis muted small">· {trip.name}</span>
          <LangToggle />
        </div>
      </header>
      {children}
      <QuickNote tripId={tripId} />
      <nav className="tabbar">
        <div className="tabbar-inner">
          {tabs.map(([icon, label, href]) => {
            const active = href === base ? path === base || path.startsWith(`${base}/item`) : href !== "/" && path.startsWith(href);
            return (
              <Link key={icon} href={href} className={`tab${active ? " active" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[icon]}
                </svg>
                <span>
                  {t(label)}
                  {icon === "tickets" && pendingTickets > 0 ? ` · ${pendingTickets}` : ""}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
