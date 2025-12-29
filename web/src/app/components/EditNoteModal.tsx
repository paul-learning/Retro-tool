"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "../uiStrings";
import { useAutosizeTextarea } from "../hooks/useAutosizeTextarea";
import { Markdown } from "./Markdown";


function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function EditNoteModal({
  open,
  draft,
  setDraft,
  onCommit,
  onClose,
  meta,
}: {
  open: boolean;
  draft: { title: string; text: string };
  setDraft: React.Dispatch<React.SetStateAction<{ title: string; text: string }>>;
  onCommit: () => void;
  onClose: () => void;
  meta: { createdAt: number; updatedAt: number } | null;
}) {

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [originalDraft, setOriginalDraft] = useState<{ title: string; text: string } | null>(null);
function applyToSelection(
  transform: (selected: string) => { insert: string; cursorOffset?: number },
) {
  const el = taRef.current;
  if (!el) return;

  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const value = draft.text;

  const selected = value.slice(start, end);
  const { insert, cursorOffset } = transform(selected);

  const next = value.slice(0, start) + insert + value.slice(end);
  setDraft((d) => ({ ...d, text: next }));

  requestAnimationFrame(() => {
    const pos =
      cursorOffset != null ? start + cursorOffset : start + insert.length;
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

function wrap(prefix: string, suffix = prefix) {
  applyToSelection((sel) => {
    const s = sel || "";
    const insert = `${prefix}${s}${suffix}`;
    const cursorOffset = sel ? insert.length : prefix.length;
    return { insert, cursorOffset };
  });
}

function insertLinePrefix(prefix: string) {
  applyToSelection((sel) => {
    const insert = sel
      ? sel
          .split("\n")
          .map((l) => (l.length ? prefix + l : l))
          .join("\n")
      : prefix;
    return { insert, cursorOffset: insert.length };
  });
}

function insertLink() {
  applyToSelection((sel) => {
    const text = sel || "label";
    const insert = `[${text}](https://)`;
    // put cursor inside URL
    const cursorOffset = insert.indexOf("https://") + "https://".length;
    return { insert, cursorOffset };
  });
}


  // Keep autosize: runs when modal opens and text changes
  useAutosizeTextarea(taRef, [open, draft.text]);

  // Auto-focus textarea on open (restores “Escape works while typing” feel too)
  useEffect(() => {
    if (!open) return;
    // next tick so it focuses after render
    requestAnimationFrame(() => taRef.current?.focus());
  }, [open]);
    useEffect(() => {
    if (!open) return;

    // Snapshot draft when modal opens
    setOriginalDraft({
        title: draft.title,
        text: draft.text,
    });
    }, [open]);


    const isDirty =
        originalDraft !== null &&
        (draft.title !== originalDraft.title || draft.text !== originalDraft.text);

 // Global keyboard handling (Escape + Ctrl/Cmd+Enter)
useEffect(() => {
  if (!open) return;

  function onKeyDown(e: KeyboardEvent) {
    // Escape = cancel
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    // Ctrl/Cmd + Enter = save (only if dirty)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isDirty) return;
      onCommit();
      onClose();
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [open, onClose, onCommit, isDirty]);
       
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => {
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
        <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
            <button
            type="button"
            onClick={() => wrap("**")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Bold"
            >
            B
            </button>

            <button
            type="button"
            onClick={() => wrap("*")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Italic"
            >
            i
            </button>

            <button
            type="button"
            onClick={() => wrap("`")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Inline code"
            >
            {"</>"}
            </button>

            <button
            type="button"
            onClick={insertLink}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Link"
            >
            🔗
            </button>

            <button
            type="button"
            onClick={() => insertLinePrefix("- ")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Bulleted list"
            >
            •
            </button>

            <button
            type="button"
            onClick={() => insertLinePrefix("> ")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Quote"
            >
            “”
            </button>

            <button
            type="button"
            onClick={() => insertLinePrefix("# ")}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
            title="Heading"
            >
            H
            </button>
        </div>
        </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
                <textarea
                    value={draft.text}
                    onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                    placeholder={UI.bodyPlaceholder}
                    ref={taRef}
                    className="min-h-[220px] w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20 overflow-y-auto overflow-x-hidden"
                    onKeyDown={(e) => {
                    if (e.key === "Escape") onClose();
                    }}
                />

                <div className="min-h-[220px] w-full overflow-auto rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100">
                    <div className="text-[11px] text-zinc-400 mb-2">{UI.preview}</div>
                    <Markdown className="text-zinc-100/90">{draft.text || ""}</Markdown>
                </div>
                </div>

        {meta && (
            <div className="mt-3 text-[11px] text-zinc-400 flex justify-end">
                                <span>
                    {meta.updatedAt === meta.createdAt
                        ? `Created ${fmt(meta.createdAt)}`
                        : `Edited ${fmt(meta.updatedAt)}`}
                </span>
            </div>
            )}

        <div className="mt-4 flex items-center justify-between">
            {/* Cancel */}
            <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
                {UI.cancel}
            </button>

            <button
            disabled={!isDirty}
            onClick={() => {
                if (!isDirty) return;
                onCommit();
                onClose();
            }}
            className={
                isDirty
                ? "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                : "inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-400 cursor-not-allowed"
            }
            >
            {UI.save}
            </button>

            </div>

      </div>
    </div>
  );
}
