"use client";

import { useEffect, useRef } from "react";
import { UI } from "../uiStrings";
import { useAutosizeTextarea } from "../hooks/useAutosizeTextarea";

export function EditNoteModal({
  open,
  draft,
  setDraft,
  onCommit,
  onClose,
}: {
  open: boolean;
  draft: { title: string; text: string };
  setDraft: React.Dispatch<React.SetStateAction<{ title: string; text: string }>>;
  onCommit: () => void;
  onClose: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep autosize: runs when modal opens and text changes
  useAutosizeTextarea(taRef, [open, draft.text]);

  // Auto-focus textarea on open (restores “Escape works while typing” feel too)
  useEffect(() => {
    if (!open) return;
    // next tick so it focuses after render
    requestAnimationFrame(() => taRef.current?.focus());
  }, [open]);

  // Global Escape handling: works regardless of focus
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => {
        onCommit();
        onClose();
      }}
    >
      <div
        className="mt-24 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={UI.titlePlaceholder ?? "Title"}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04]
                  px-3 py-2 text-sm text-zinc-100 outline-none
                  focus:ring-4 focus:ring-indigo-500/20"
        />

        <textarea
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          placeholder={UI.bodyPlaceholder}
          ref={taRef}
          className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20 min-h-[160px] overflow-y-auto overflow-x-hidden"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onCommit();
              onClose();
            }
            if (e.key === "Escape") onClose();
          }}
        />
      </div>
    </div>
  );
}
