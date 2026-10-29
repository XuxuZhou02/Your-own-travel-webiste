"use client";

// "Note this" (product plan, section 4.8): one sentence, typed or spoken, and
// the AI files it in the right place. Low-risk kinds save at once with an
// undo card; high-risk kinds show a preview and need a tap.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAI } from "@/lib/ai";
import type { NoteClassification } from "@/lib/ai/notes";
import { fileQuickNote, undoQuickNote } from "@/lib/state";
import { useStore } from "@/lib/store";
import type { Bilingual, NoteKind } from "@/lib/types";
import { Sheet } from "./ui";

const KIND_LABEL: Record<NoteKind, Bilingual> = {
  note: { en: "Note", zh: "笔记" },
  todo: { en: "To-do", zh: "待办" },
  place: { en: "New place", zh: "新地点" },
  reminder: { en: "Reminder", zh: "提醒" },
  "itinerary-change": { en: "Itinerary change", zh: "行程调整" },
  expense: { en: "Expense", zh: "花费" },
  question: { en: "Question", zh: "提问" },
};

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function QuickNote({ tripId }: { tripId: string }) {
  const { state, act, t, tr } = useStore();
  const path = usePathname();
  const contextItemId = /\/item\/([^/]+)/.exec(path)?.[1];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<NoteClassification | null>(null);
  const [answer, setAnswer] = useState<Bilingual | null>(null);
  const [toast, setToast] = useState<{ noteId: string; savedTo: Bilingual } | null>(null);
  const [listening, setListening] = useState(false);
  const recog = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const close = () => {
    setOpen(false);
    setText("");
    setPreview(null);
    setAnswer(null);
  };

  const save = (c: NoteClassification) => {
    const r = act((s) => fileQuickNote(s, tripId, text.trim(), c, contextItemId));
    if (r.answer) {
      setAnswer(r.answer);
      return;
    }
    close();
    setToast({ noteId: r.noteId, savedTo: r.savedTo });
  };

  const submit = async () => {
    if (!text.trim()) return;
    const c = await getAI().classifyNote(text.trim());
    if (c.risk === "high") setPreview(c);
    else save(c);
  };

  const toggleVoice = () => {
    if (listening) return recog.current?.stop();
    const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const Impl = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Impl) return alert(state.lang === "zh" ? "这个浏览器不支持语音输入，请直接打字。" : "Voice input isn't supported in this browser. Please type instead.");
    const r = new Impl();
    r.lang = state.lang === "zh" ? "zh-CN" : "en-US";
    r.interimResults = false;
    r.onresult = (e) => setText((prev) => `${prev} ${e.results[0][0].transcript}`.trim());
    r.onend = () => setListening(false);
    recog.current = r;
    setListening(true);
    r.start();
  };

  const note = toast && state.notes.find((n) => n.id === toast.noteId);

  return (
    <>
      <button className="fab no-print" onClick={() => setOpen(true)}>✎ {t("noteThis")}</button>

      {open && (
        <Sheet onClose={close}>
          <div className="stack">
            <h2>{t("noteThis")}</h2>
            {!preview && !answer && (
              <>
                <textarea
                  autoFocus
                  value={text}
                  placeholder={t("notePlaceholder")}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                <div className="row">
                  <button className={listening ? "btn-ok" : ""} onClick={toggleVoice} aria-label="Voice">
                    🎙 {listening ? "…" : ""}
                  </button>
                  <span className="grow" />
                  <button onClick={close}>{t("cancel")}</button>
                  <button className="btn-primary" onClick={submit} disabled={!text.trim()}>
                    {t("save")}
                  </button>
                </div>
              </>
            )}

            {preview && (
              <div className="card stack">
                <div className="row">
                  <span className="chip ai">✦ {tr(KIND_LABEL[preview.kind])}</span>
                </div>
                <p className="muted small">“{text}”</p>
                {preview.kind === "place" && (
                  <label className="field">
                    <span>{t("placeName")}</span>
                    <input value={preview.placeName ?? ""} onChange={(e) => setPreview({ ...preview, placeName: e.target.value })} />
                  </label>
                )}
                {preview.kind === "expense" && (
                  <p className="small">
                    {preview.amount} {preview.currency ?? ""} · {t("expensePhase2")}
                  </p>
                )}
                {preview.kind === "itinerary-change" && (
                  <p className="small">
                    {state.lang === "zh"
                      ? "会作为一条调整建议出现在行程页顶部，由你确认后再动手改。AI 不会直接改动已锁定的项目。"
                      : "This becomes a proposal at the top of the itinerary. You make the change after reviewing it; AI never edits a locked item directly."}
                  </p>
                )}
                <div className="row">
                  <button onClick={() => save({ ...preview, kind: "note", risk: "low" })}>
                    {state.lang === "zh" ? "只存为笔记" : "Just a note"}
                  </button>
                  <span className="grow" />
                  <button onClick={() => setPreview(null)}>{t("cancel")}</button>
                  <button className="btn-primary" disabled={preview.kind === "place" && !preview.placeName?.trim()} onClick={() => save(preview)}>
                    {t("confirmSave")}
                  </button>
                </div>
              </div>
            )}

            {answer && (
              <div className="stack">
                <p className="muted small">“{text}”</p>
                <div className="banner ai">{tr(answer)}</div>
                <button onClick={close}>OK</button>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {toast && note && (
        <div className="toast" role="status">
          <span className="grow">
            {t("savedTo")}: {tr(toast.savedTo)}
          </span>
          <button
            title={note.visibility === "private" ? t("onlyYou") : t("wholeGroup")}
            onClick={() => act((s) => {
              const n = s.notes.find((x) => x.id === note.id)!;
              n.visibility = n.visibility === "private" ? "group" : "private";
            })}
          >
            {note.visibility === "private" ? "🔒" : "👥"}
          </button>
          <button
            onClick={() => {
              act((s) => undoQuickNote(s, toast.noteId));
              setToast(null);
            }}
          >
            {t("undo")}
          </button>
        </div>
      )}
    </>
  );
}
