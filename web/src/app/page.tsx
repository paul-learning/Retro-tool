"use client";

import { useEffect, useMemo, useState } from "react";

type Note = {
  id: string;
  text: string;
};

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadNotes() {
    const res = await fetch("/api/notes");
    setNotes(await res.json());
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function addNote() {
    const value = text.trim();
    if (!value || busy) return;

    try {
      setBusy(true);
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      setText("");
      await loadNotes();
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    if (busy) return;
    try {
      setBusy(true);
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      await loadNotes();
    } finally {
      setBusy(false);
    }
  }

  const countLabel = useMemo(() => {
    const n = notes.length;
    return n === 1 ? "1 note" : `${n} notes`;
  }, [notes.length]);

  return (
    <main className="min-h-screen bg-[#0B0D12] text-zinc-100">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[10%] top-[-160px] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-[10%] top-[-220px] h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B0D12]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em]">Notes</h1>
            <p className="mt-1 text-xs text-zinc-400">{countLabel}</p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              ⌘/Ctrl + Enter
            </span>
          </div>
        </div>
      </header>

      {/* content */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-28 pt-5">
        {notes.length === 0 ? (
          <div className="grid place-items-center py-24">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="text-sm font-semibold">No notes yet</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Add your first note below. Keep them short and actionable.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <article
                key={note.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_50px_rgba(0,0,0,0.35)] transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/90">
                    {note.text}
                  </div>
                </div>

                <div className="flex items-center justify-end border-t border-white/10 px-3 py-2">
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={busy}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-200/90 transition hover:bg-white/[0.06] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* composer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0B0D12]/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-end gap-3 px-5 py-3">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a note…"
              rows={1}
              className="max-h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-[0_14px_50px_rgba(0,0,0,0.30)] outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
              onKeyDown={(e) => {
                const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === "Enter";
                if (isCmdEnter) {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[11px] text-zinc-500">
                Tip: Use Cmd/Ctrl+Enter to add
              </span>
              <span className="text-[11px] text-zinc-500">
                {text.trim().length}/500
              </span>
            </div>
          </div>

          <button
            onClick={addNote}
            disabled={busy || !text.trim()}
            className="h-[46px] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/95 to-indigo-600/95 px-4 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:from-indigo-400/95 hover:to-indigo-600/95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            {busy ? "Saving…" : "Add"}
          </button>
        </div>
      </footer>
    </main>
  );
}
