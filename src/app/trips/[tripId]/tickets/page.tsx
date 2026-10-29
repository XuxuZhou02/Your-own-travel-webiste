"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FileImage, Sheet, UserName } from "@/components/ui";
import { getAI } from "@/lib/ai";
import { putFile } from "@/lib/files";
import { proposeAnchor, type Proposal } from "@/lib/schedule";
import { addTicket, applyProposal, confirmTicket, dayItems, matchTicket, movableConflictIds, resolveByMoving, tripDays, uid } from "@/lib/state";
import { useStore } from "@/lib/store";
import { formatDate, formatTime, parseTime } from "@/lib/time";
import type { ChangeLogEntry, Ticket } from "@/lib/types";

export default function TicketsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { state, act, t, tr } = useStore();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [conflict, setConflict] = useState<{ ticketId: string; proposal: Proposal } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tickets = state.tickets.filter((x) => x.tripId === tripId);
  const pending = tickets.filter((x) => x.status === "pending");
  const confirmed = tickets
    .filter((x) => x.status === "confirmed")
    .sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9") || (a.time ?? 0) - (b.time ?? 0));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const fileId = uid("f-");
        await putFile(fileId, file);
        const reading = await getAI().readTicket(file);
        act((s) =>
          addTicket(s, tripId, {
            fileId,
            fileName: file.name,
            name: reading.name ?? "",
            date: reading.date,
            time: reading.time,
            endTime: reading.endTime,
            headcount: reading.headcount,
            orderNumber: reading.orderNumber,
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = (ticket: Ticket) => {
    const { result, summary } = act((s) => {
      const r = confirmTicket(s, ticket.id, ticket);
      return { result: r, summary: s.changeLog[0]?.summary };
    });
    if (result.kind === "conflict") setConflict({ ticketId: ticket.id, proposal: result.proposal });
    else if (result.kind === "applied") {
      setMessage(result.proposal.changes.length && summary ? tr(summary) : t("ticketMatched"));
    } else setMessage(state.lang === "zh" ? "已确认。还没有对应的行程项目，所以行程没有变化。" : "Confirmed. It isn't matched to an itinerary item, so the plan didn't change.");
  };

  return (
    <main className="page stack">
      <h1>{t("tickets")}</h1>

      <label className="btn btn-primary btn-block">
        ⬆ {busy ? "…" : t("uploadTickets")}
        <input type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </label>

      {message && <AppliedBanner text={message} onDone={() => setMessage(null)} />}

      {pending.length > 0 && (
        <section className="stack">
          <h2>{t("pending")} · {pending.length}</h2>
          <p className="small muted">{t("pendingHint")}</p>
          {pending.map((x) => (
            <PendingTicket key={x.id} ticket={x} onConfirm={confirm} onOpen={() => setOpen(x)} />
          ))}
        </section>
      )}

      <section className="stack">
        <h2>{t("confirmed")} · {confirmed.length}</h2>
        {tickets.length === 0 && <p className="muted center" style={{ padding: 20 }}>{t("emptyTickets")}</p>}
        {confirmed.map((x) => {
          const item = state.items.find((i) => i.id === x.itemId);
          return (
            <button key={x.id} id={x.id} className="card stack" style={{ textAlign: "left", alignItems: "stretch", gap: 4 }} onClick={() => setOpen(x)}>
              <div className="spread">
                <h3>🎟 {x.name}</h3>
                <span className={`chip ${item ? "ok" : "warn"}`}>{item ? "✓" : t("unmatched")}</span>
              </div>
              <span className="small muted">
                {x.date ? formatDate(x.date, state.lang) : "—"} · {x.time !== undefined ? formatTime(x.time) : "—"}
                {x.endTime !== undefined ? `–${formatTime(x.endTime)}` : ""} · {x.headcount ?? ""}
              </span>
              {item && <span className="tiny muted">→ {item.title}</span>}
            </button>
          );
        })}
      </section>

      {open && <TicketViewer ticket={open} onClose={() => setOpen(null)} />}
      {conflict && (
        <ConflictSheet
          tripId={tripId}
          ticketId={conflict.ticketId}
          proposal={conflict.proposal}
          onClose={(msg) => {
            setConflict(null);
            if (msg) setMessage(msg);
          }}
        />
      )}
    </main>
  );
}

function AppliedBanner({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 6000);
    return () => clearTimeout(timer);
  }, [text, onDone]);
  return <div className="banner ok small">{text}</div>;
}

function PendingTicket({ ticket, onConfirm, onOpen }: { ticket: Ticket; onConfirm: (t: Ticket) => void; onOpen: () => void }) {
  const { state, t } = useStore();
  const [f, setF] = useState(ticket);
  const trip = state.trips.find((x) => x.id === ticket.tripId)!;
  // The date is ambiguous or unknown until the user picks it, so it is always shown for confirmation.
  const items = f.date ? dayItems(state, ticket.tripId, f.date).filter((i) => i.kind === "activity") : [];
  const suggested = matchTicket(state, f);

  useEffect(() => {
    if (!f.itemId && suggested) setF((prev) => ({ ...prev, itemId: suggested }));
  }, [suggested, f.itemId]);

  return (
    <div className="card stack" style={{ borderColor: "var(--warn)" }}>
      <div className="spread">
        <span className="chip warn">{t("pending")} · ✦ AI</span>
        <button className="btn-small" onClick={onOpen}>{t("openTicket")}</button>
      </div>
      <p className="tiny muted">
        {ticket.fileName} · <UserName id={ticket.uploadedBy} />
      </p>
      <label className="field">
        <span>{t("placeName")}</span>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, itemId: undefined })} />
      </label>
      <div className="grid2">
        <label className="field">
          <span>{t("date")}</span>
          <select value={f.date ?? ""} onChange={(e) => setF({ ...f, date: e.target.value || undefined, itemId: undefined })}>
            <option value="">—</option>
            {tripDays(trip).map((d) => (
              <option key={d} value={d}>{formatDate(d, state.lang)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("entryTime")}</span>
          <input
            type="time"
            value={f.time !== undefined ? formatTime(f.time) : ""}
            onChange={(e) => setF({ ...f, time: e.target.value ? parseTime(e.target.value) : undefined })}
          />
        </label>
        <label className="field">
          <span>{t("headcount")}</span>
          <input value={f.headcount ?? ""} placeholder="Adult × 5" onChange={(e) => setF({ ...f, headcount: e.target.value })} />
        </label>
        <label className="field">
          <span>{t("orderNumber")}</span>
          <input value={f.orderNumber ?? ""} onChange={(e) => setF({ ...f, orderNumber: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>{t("matchTo")}</span>
        <select value={f.itemId ?? ""} onChange={(e) => setF({ ...f, itemId: e.target.value || undefined })}>
          <option value="">{t("chooseItem")}</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {formatTime(i.start)} {i.title}
            </option>
          ))}
        </select>
      </label>
      {f.itemId && f.time !== undefined && (() => {
        const item = state.items.find((i) => i.id === f.itemId);
        return item && item.start !== f.time ? (
          <p className="banner small">
            {state.lang === "zh"
              ? `计划是 ${formatTime(item.start)}，票上是 ${formatTime(f.time)}。确认后会以票为准调整当天行程。`
              : `The plan says ${formatTime(item.start)} and the ticket says ${formatTime(f.time)}. Confirming moves the day to match the ticket.`}
          </p>
        ) : null;
      })()}
      <button className="btn-ok" disabled={!f.name.trim()} onClick={() => onConfirm(f)}>✓ {t("confirm")}</button>
    </div>
  );
}

function TicketViewer({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const { state, t } = useStore();
  useEffect(() => {
    // Keep the screen on while a ticket is open. Browsers don't let pages set
    // screen brightness, so the viewer uses a plain white background instead.
    let lock: { release: () => Promise<void> } | undefined;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);
  return (
    <div className="ticket-full" role="dialog" aria-modal="true">
      <div className="spread">
        <div>
          <h2>{ticket.name}</h2>
          <p className="muted small">
            {ticket.date ? formatDate(ticket.date, state.lang) : ""} · {ticket.time !== undefined ? formatTime(ticket.time) : ""} · {ticket.headcount ?? ""}
            {ticket.orderNumber ? ` · #${ticket.orderNumber}` : ""}
          </p>
        </div>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="body">
        {ticket.fileId ? (
          <FileImage fileId={ticket.fileId} alt={ticket.name} />
        ) : (
          <div className="center muted stack">
            <div style={{ fontSize: 80 }}>🎟</div>
            <p>{state.lang === "zh" ? "演示票没有附件。上传真实的票后，二维码会在这里放大显示，离线也能打开。" : "Demo ticket with no file. Real uploads show the QR code here, full size, even offline."}</p>
          </div>
        )}
      </div>
      <p className="tiny muted center">{t("tickets")} · Footnote</p>
    </div>
  );
}

function ConflictSheet({
  tripId,
  ticketId,
  proposal: initial,
  onClose,
}: {
  tripId: string;
  ticketId: string;
  proposal: Proposal;
  onClose: (message?: string) => void;
}) {
  const { state, act, t, tr } = useStore();
  const trip = state.trips.find((x) => x.id === tripId)!;
  const [proposal, setProposal] = useState(initial);
  const [mode, setMode] = useState<"choose" | "time" | "day">("choose");
  const anchor = proposal.items.find((i) => i.id === proposal.anchorId)!;
  const [time, setTime] = useState(formatTime(anchor.start));
  const [day, setDay] = useState(tripDays(trip).find((d) => d !== proposal.date) ?? proposal.date);
  const title = (id?: string) => proposal.items.find((i) => i.id === id)?.title ?? "";
  const movable = movableConflictIds(proposal);

  const done = (entry: ChangeLogEntry) => onClose(tr(entry.summary));

  const retryWithTime = () => {
    const before = dayItems(state, tripId, proposal.date).filter((i) => i.id !== anchor.id);
    const next = proposeAnchor([...before, { ...anchor, start: anchor.originalStart ?? anchor.start }], anchor.id, parseTime(time));
    if (next.conflicts.length) {
      setProposal(next);
      setMode("choose");
    } else {
      done(act((s) => applyProposal(s, tripId, next, "conflict")));
    }
  };

  const cancel = () => {
    // Nothing changed in the itinerary; the ticket goes back to pending.
    act((s) => void (s.tickets.find((x) => x.id === ticketId)!.status = "pending"));
    onClose();
  };

  return (
    <Sheet onClose={cancel}>
      <div className="stack">
        <h2>⚠ {t("conflictTitle")}</h2>
        <div className="card stack" style={{ gap: 4 }}>
          <b className="small">{t("proposed")}</b>
          {proposal.changes.map((c) => (
            <p key={c.id} className="small">
              {title(c.id)}: {formatTime(c.from)} → <b>{formatTime(c.to)}</b>
            </p>
          ))}
          {proposal.conflicts.map((c, k) => (
            <p key={k} className="small" style={{ color: "var(--danger)" }}>
              {c.type === "overlap-fixed"
                ? state.lang === "zh"
                  ? `${title(c.itemId)} 会和已锁定的 ${title(c.withItemId)} 重叠`
                  : `${title(c.itemId)} would overlap the locked ${title(c.withItemId)}`
                : c.type === "past-day-end"
                  ? state.lang === "zh" ? `${title(c.itemId)} 会排到半夜之后` : `${title(c.itemId)} would run past midnight`
                  : state.lang === "zh" ? `${title(c.itemId)} 会早于早上 7 点` : `${title(c.itemId)} would start before 7:00`}
            </p>
          ))}
        </div>

        {mode === "choose" && (
          <div className="stack">
            <button onClick={() => setMode("time")}>🕘 {t("changeTime")}</button>
            {movable.length > 0 && <button onClick={() => setMode("day")}>📅 {t("moveDay")}</button>}
            <button
              onClick={() => {
                done(act((s) => applyProposal(s, tripId, proposal, "conflict")));
              }}
            >
              ⚠ {t("keepConflict")}
            </button>
            <button className="btn-ghost" onClick={cancel}>{t("cancel")}</button>
          </div>
        )}

        {mode === "time" && (
          <div className="stack">
            <label className="field">
              <span>{anchor.title}</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <div className="row">
              <span className="grow" />
              <button onClick={() => setMode("choose")}>{t("cancel")}</button>
              <button className="btn-primary" onClick={retryWithTime}>{t("apply")}</button>
            </div>
          </div>
        )}

        {mode === "day" && (
          <div className="stack">
            <p className="small muted">
              {state.lang === "zh" ? "把冲突的项目挪到：" : "Move the colliding items to:"}{" "}
              {movable.map(title).join(", ")}
            </p>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {tripDays(trip)
                .filter((d) => d !== proposal.date)
                .map((d) => (
                  <option key={d} value={d}>{formatDate(d, state.lang)}</option>
                ))}
            </select>
            <div className="row">
              <span className="grow" />
              <button onClick={() => setMode("choose")}>{t("cancel")}</button>
              <button
                className="btn-primary"
                onClick={() => {
                  done(act((s) => resolveByMoving(s, tripId, proposal, day)));
                }}
              >
                {t("apply")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
