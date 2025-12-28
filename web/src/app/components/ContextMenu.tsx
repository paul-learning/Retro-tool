"use client";

import { UI } from "../uiStrings";

export function ContextMenu({
  open,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        // click outside closes
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="absolute min-w-[160px] rounded-xl border border-white/10 bg-[#0B0D12]/95 p-1 text-sm text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()} // don't close when clicking menu itself
      >
        <button
          className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
          onClick={() => {
            onEdit();
            onClose();
          }}
        >
          {UI.menuEdit}
        </button>

        <button
          className="w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          {UI.menuDelete}
        </button>
      </div>
    </div>
  );
}
