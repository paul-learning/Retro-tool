"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useNotes } from "./useNotes";
import { useEffect, useState } from "react";



export default function Page() {
  const {
    notes,
    text,
    setText,
    addNote,
    deleteNote,
    editingId,
    editingText,
    setEditingText,
    startEdit,
    focusEditor,
    commitEdit,
    cancelEdit, 
    editorRef,
  } = useNotes();

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
              Your Notes
            </h1>
            <p className="mt-1 text-xs text-zinc-400">{notes.length} notes</p>
          </div>
          <span className="hidden sm:inline rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            ⌘/Ctrl + Enter
          </span>
        </div>
      </header>

      {/* notes */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-28 pt-5">
        {notes.length === 0 ? (
          <div className="grid place-items-center py-24">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="text-sm font-semibold">No notes yet</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Add your first note below.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <article
                key={note.id}
                onClick={() => {
                  startEdit(note);
                  focusEditor();
                }}
                onContextMenu={(e) => openMenu(e, note.id)}
                className="group cursor-text rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_50px_rgba(0,0,0,0.35)] transition hover:border-white/15 hover:bg-white/[0.06]"
>
                <div className="p-4">
                  {editingId === note.id ? (
                    <textarea
                      ref={editorRef}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-zinc-100/90 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => {
                        // allow context menu even while editing
                        e.stopPropagation();
                        openMenu(e, note.id);
                      }}
                      onKeyDown={(e) => {
                        // Save on Ctrl/Cmd+Enter
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          commitEdit();
                          return;
                        }

                        // Stop editing on Escape (no save)
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                          return;
                        }
                      }}
                      onBlur={() => {
                        // Save when leaving the field
                        commitEdit();
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/90">
                      {note.text}
                    </div>
                  )}
                </div>


                <div className="flex items-center justify-between 0 px-1 py-1">
                  <button
                    onClick={() => {
                      startEdit(note);
                      focusEditor();
                    }}
                    aria-label="Edit note"
                    title="Edit"
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
                    aria-label="Delete note"
                    title="Delete"
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

      {/* composer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0B0D12]/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-end gap-3 px-5 py-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note…"
            rows={1}
            className="max-h-40 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-[0_14px_50px_rgba(0,0,0,0.30)] outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                addNote();
              }
            }}
          />
          <button
            onClick={addNote}
            disabled={!text.trim()}
            className="h-[46px] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/95 to-indigo-600/95 px-4 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:from-indigo-400/95 hover:to-indigo-600/95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            Add
          </button>
        </div>
      </footer>
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
            startEdit(n);
            focusEditor();
          }
          closeMenu();
        }}
      >
        Edit
      </button>

      <button
        className="w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"
        onClick={() => {
          deleteNote(menu.noteId!);
          closeMenu();
        }}
      >
        Delete
      </button>
    </div>
  </div>
)}
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
              startEdit(n);
              focusEditor();
            }
            closeMenu();
          }}
        >
          Edit
        </button>

        <button
          className="w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-white/5"
          onClick={() => {
            deleteNote(menu.noteId!);
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )}

    </main>
  );
}
