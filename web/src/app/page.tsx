"use client";

import { Pencil, Trash2, Plus } from "lucide-react";
import { useNotes } from "./useNotes";
import { useEffect, useRef, useState } from "react";
import { UI } from "./uiStrings";

function ClampedText({
  text,
}: {
  text: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If content overflows, it was clamped
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/90 line-clamp-6"
      >
        {text}
      </div>

      {clamped && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0B0D12] to-transparent" />
          <div className="pointer-events-none absolute bottom-1 right-2 text-xs text-zinc-400">
            {UI.moreText}
          </div>
        </>
      )}
    </div>
  );
}


export default function Page() {
const {
  notes,
  deleteNote,

  draft,
  setDraft,
  startCreate,
  startEditModal,
  commitDraft,
} = useNotes();

  const [modalOpen, setModalOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

useEffect(() => {
  if (!modalOpen) return;
  const el = taRef.current;
  if (!el) return;

  // reset then grow to content height
  el.style.height = "auto";

  // cap to viewport (match your modal max: 100vh - 8rem, minus padding/header feel)
  const max = window.innerHeight - 8 * 16; // 8rem
  el.style.height = Math.min(el.scrollHeight, max - 32 /*modal padding*/ ) + "px";
}, [modalOpen, draft]);


  const [menu, setMenu] = useState<{
  open: boolean;
  x: number;
  y: number;
  noteId: string | null;
}>({ open: false, x: 0, y: 0, noteId: null });

function closeMenu() {
  setMenu((m) => ({ ...m, open: false, noteId: null }));
}

function openMenu(e: React.MouseEvent, noteId: string) {
  e.preventDefault(); // stop browser context menu
  setMenu({ open: true, x: e.clientX, y: e.clientY, noteId });
}

  return (
    <main className="min-h-screen bg-[#0B0D12] text-zinc-100">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[10%] top-[-160px] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-[10%] top-[-220px] h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B0D12]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em]">
              {UI.headerTitle}
            </h1>
            <p className="mt-1 text-xs text-zinc-400">{UI.notesCount(notes.length)}</p>
          </div>
          <span className="hidden sm:inline rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            {UI.keyboardHint}
          </span>
        </div>
      </header>

      {/* notes */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-28 pt-5">
        {notes.length === 0 ? (
          <div className="grid place-items-center py-24">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="text-sm font-semibold">{UI.emptyStateTitle}</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {UI.emptyStateBody}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 items-start sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <article
                key={note.id}
                onClick={() => {
                  startEditModal(note);
                  setModalOpen(true);
                }}
                onContextMenu={(e) => openMenu(e, note.id)}
                className="group cursor-text rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_50px_rgba(0,0,0,0.35)] transition hover:border-white/15 hover:bg-white/[0.06] h-48 flex flex-col"
              >
                <div className="p-4 flex-1 overflow-hidden">
                  <ClampedText text={note.text} />
                </div>


                <div className="flex items-center justify-between 0 px-1 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditModal(note);
                      setModalOpen(true);
                    }}
                    aria-label={UI.ariaEditNote}
                    title={UI.titleEdit}
                    className="
                      inline-flex items-center justify-center
                      rounded-lg
                      border border-white/10
                      bg-white/[0.03]
                      p-1
                      text-zinc-400
                      transition
                      hover:bg-white/[0.06]
                      hover:text-zinc-200
                      focus:outline-none
                      focus:ring-2
                      focus:ring-indigo-500/20
                    "
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => deleteNote(note.id)}
                    aria-label={UI.ariaDeleteNote}
                    title={UI.titleDelete}
                    className="
                      inline-flex items-center justify-center
                      rounded-lg
                      border border-white/10
                      bg-white/[0.03]
                      p-1
                      text-zinc-400
                      transition
                      hover:bg-white/[0.06]
                      hover:text-zinc-200
                      focus:outline-none
                      focus:ring-2
                      focus:ring-red-500/20
                    "
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </article>
            ))}
          </div>
        )}
      </section>
      
  {menu.open && menu.noteId && (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        // click outside closes
        e.stopPropagation();
        closeMenu();
      }}
    >
      <div
        className="absolute min-w-[160px] rounded-xl border border-white/10 bg-[#0B0D12]/95 p-1 text-sm text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{ left: menu.x, top: menu.y }}
        onMouseDown={(e) => e.stopPropagation()} // don't close when clicking menu itself
      >
        <button
          className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
          onClick={() => {
            const n = notes.find((n) => n.id === menu.noteId);
            if (n) {
              startEditModal(n);
              setModalOpen(true);
            }
            closeMenu();
          }}
        >
          {UI.menuEdit}
        </button>

        <button
          className="w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"
          onClick={() => {
            deleteNote(menu.noteId!);
            closeMenu();
          }}
        >
          {UI.menuDelete}
        </button>
      </div>
    </div>
  )}
  <button
      onClick={() => {
        startCreate();
        setModalOpen(true);
      }}
  className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white text-3xl shadow-xl transition hover:bg-indigo-500 flex items-center justify-center leading-none"
    >
    <Plus className="h-7 w-7" />
  </button>
      {modalOpen && (
  <div
    className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
    onMouseDown={() => {
      commitDraft();
      setModalOpen(false);
    }}
  >
    <div
      className="mt-24 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl flex flex-col max-h-[calc(100vh-8rem)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        ref={taRef}
        autoFocus
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20 min-h-[160px] overflow-auto"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            setModalOpen(false);
          }
          if (e.key === "Escape") {
            setModalOpen(false);
          }
        }}
      />
    </div>
  </div>
)}

    </main>
  );
}
