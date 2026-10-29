"use client";

import { useEffect, useState } from "react";
import { getFile } from "@/lib/files";
import { useStore } from "@/lib/store";

export function LangToggle() {
  const { state, act } = useStore();
  return (
    <button
      className="btn-small"
      onClick={() => act((s) => void (s.lang = s.lang === "en" ? "zh" : "en"))}
      aria-label="Switch language"
    >
      {state.lang === "en" ? "中文" : "EN"}
    </button>
  );
}

export function AiChip() {
  const { t } = useStore();
  return <span className="chip ai">✦ {t("aiGenerated")}</span>;
}

/** Loads a blob stored on the device and shows it as an image (or a PDF link). */
export function FileImage({ fileId, alt, className }: { fileId: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState("");
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    getFile(fileId).then((blob) => {
      if (!blob || revoked) return;
      objectUrl = URL.createObjectURL(blob);
      setType(blob.type);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);
  if (!url) return <div className={className ?? "thumb"} />;
  if (type === "application/pdf") return <iframe src={url} title={alt} className={className} />;
  return <img src={url} alt={alt} className={className} />;
}

export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function UserName({ id }: { id: string }) {
  const { state } = useStore();
  const u = state.users.find((x) => x.id === id);
  if (id === state.me) return <>{state.lang === "zh" ? "我" : "You"}</>;
  return <>{u?.name ?? "?"}</>;
}
