"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, CheckSquare, FileText } from "lucide-react";
import { UI } from "../uiStrings";

export function Fab({
  onNewTextNote,
  onNewChecklist,
  ariaLabel = UI.ariaLabelFab,
}: {
  onNewTextNote: () => void;
  onNewChecklist: () => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const actionBase =
    "w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2 text-sm text-zinc-100 shadow-xl " +
    "hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 " +
    "flex items-center gap-2";

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Drop-up actions */}
      <div
        className={[
          "mb-3 flex flex-col gap-2 items-end pointer-events-none",
          "transition-all duration-200 ease-out",
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        ].join(" ")}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={actionBase + (open ? " pointer-events-auto" : "")}
          onClick={() => {
            setOpen(false);
            onNewTextNote();
          }}
        >
          <FileText className="h-4 w-4" />
          <span>Text</span>
        </button>

        <button
          type="button"
          className={actionBase + (open ? " pointer-events-auto" : "")}
          onClick={() => {
            setOpen(false);
            onNewChecklist();
          }}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Checklist</span>
        </button>
      </div>

      {/* Main FAB */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={[
          "h-14 w-14 rounded-full bg-indigo-600 text-white text-3xl shadow-xl",
          "transition hover:bg-indigo-500 flex items-center justify-center leading-none",
          open ? "ring-4 ring-indigo-500/20" : "",
        ].join(" ")}
      >
        <Plus className={["h-7 w-7 transition-transform duration-200", open ? "rotate-45" : ""].join(" ")} />
      </button>
    </div>
  );
}
