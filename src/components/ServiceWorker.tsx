"use client";

import { useEffect } from "react";

/** Registers the offline cache (production builds only, so dev reloads stay fresh). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
