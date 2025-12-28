"use client";

import { UI } from "../uiStrings";

export function NotesHeader({ count }: { count: number }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B0D12]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em]">
              {UI.headerTitle}
            </h1>
            <p className="mt-1 text-xs text-zinc-400">{UI.notesCount(count)}</p>
          </div>
        </div>

        <span className="hidden sm:inline rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {UI.keyboardHint}
        </span>
      </div>
    </header>
  );
}
