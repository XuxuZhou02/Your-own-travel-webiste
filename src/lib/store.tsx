"use client";

// Prototype persistence: the whole state lives in localStorage on this
// device (files in IndexedDB). The Supabase schema in /supabase is the
// multi-user version of the same model.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { translate, type MsgKey } from "./i18n";
import { demoState } from "./seed";
import type { State } from "./state";
import type { Bilingual } from "./types";

const KEY = "footnote:v1";

interface Store {
  state: State;
  /** Runs an operation on a draft copy and saves the result. Returns the operation's value. */
  act: <T>(op: (draft: State) => T) => T;
  reset: () => void;
  t: (key: MsgKey) => string;
  tr: (text: Bilingual) => string;
}

const Ctx = createContext<Store | null>(null);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    // Unreadable storage falls back to the demo trip.
  }
  return demoState();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const current = useRef<State | null>(null);

  useEffect(() => {
    const s = load();
    current.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    if (!state) return;
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }, [state]);

  const act = useCallback(<T,>(op: (draft: State) => T): T => {
    const draft = structuredClone(current.current!);
    const result = op(draft);
    current.current = draft;
    setState(draft);
    return result;
  }, []);

  const reset = useCallback(() => {
    const s = demoState();
    s.lang = current.current?.lang ?? "en";
    current.current = s;
    setState(s);
  }, []);

  const value = useMemo<Store | null>(
    () =>
      state && {
        state,
        act,
        reset,
        t: (key) => translate(state.lang, key),
        tr: (text) => text[state.lang],
      },
    [state, act, reset],
  );

  if (!value) return <div className="loading">Footnote · 行迹</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
