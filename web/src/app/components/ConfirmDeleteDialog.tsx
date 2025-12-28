"use client";

import { useEffect, useRef } from "react";
import { UI } from "../uiStrings";

export function ConfirmDeleteDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLDivElement | null>(null);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) deleteBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={confirmRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="w-[92vw] max-w-sm rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold">{UI.confirmDeleteTitle}</div>
        <p className="mt-2 text-xs text-zinc-400">{UI.confirmDeleteBody}</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            onClick={onCancel}
          >
            {UI.cancel}
          </button>

          <button
            ref={deleteBtnRef}
            className="rounded-xl border border-white/10 bg-red-500/90 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
            onClick={onConfirm}
          >
            {UI.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
