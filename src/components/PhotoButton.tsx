"use client";

import { useRef, useState } from "react";
import { compressImage, putFile } from "@/lib/files";
import { addPhoto, uid } from "@/lib/state";
import { useStore } from "@/lib/store";

/**
 * Camera icon on every itinerary item (section 4.6): opens the camera or the
 * photo library, several at once. A browsing copy is compressed; the
 * original is kept too.
 */
export function PhotoButton({ tripId, itemId, label }: { tripId: string; itemId?: string; label?: string }) {
  const { act } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const fileId = uid("f-");
        await putFile(`${fileId}:orig`, file);
        await putFile(fileId, await compressImage(file));
        act((s) => addPhoto(s, tripId, fileId, itemId));
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <button
        className={label ? "" : "btn-small"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.current?.click();
        }}
        disabled={busy}
        aria-label="Add photos"
      >
        📷{label ? ` ${label}` : ""}{busy ? " …" : ""}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </>
  );
}
