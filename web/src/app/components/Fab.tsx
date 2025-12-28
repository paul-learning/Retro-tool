"use client";

import { Plus } from "lucide-react";
import { UI } from "../uiStrings";

export function Fab({
  onClick,
  ariaLabel = UI.ariaLabelFab,
}: {
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white text-3xl shadow-xl transition hover:bg-indigo-500 flex items-center justify-center leading-none"
    >
      <Plus className="h-7 w-7" />
    </button>
  );
}
