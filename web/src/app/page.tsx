"use client";

import { useState } from "react";
import { useNotes } from "./useNotes";
import { UI } from "./uiStrings";
import { useContextMenu } from "./hooks/useContextMenu";
import { NotesHeader } from "./components/NotesHeader";
import { NoteCard } from "./components/NoteCard";
import { ContextMenu } from "./components/ContextMenu";
import { EditNoteModal } from "./components/EditNoteModal";
import { ConfirmDeleteDialog } from "./components/ConfirmDeleteDialog";
import { Fab } from "./components/Fab";
import { AppFooter } from "./components/AppFooter";

export default function Page() {
  const { notes, deleteNote, draft, setDraft, startCreate, startEditModal, commitDraft } =
    useNotes();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { menu, closeMenu, openMenu } = useContextMenu();

  return (
    <main className="min-h-screen bg-[#0B0D12] text-zinc-100">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[10%] top-[-160px] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-[10%] top-[-220px] h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <NotesHeader count={notes.length} />

      <section className="mx-auto max-w-5xl px-5 pb-24 pt-6">
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
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => {
                  startEditModal(note);
                  setModalOpen(true);
                }}
                onContextMenu={(e) => openMenu(e, note.id)}
                onEditClick={(e) => {
                  e.stopPropagation();
                  startEditModal(note);
                  setModalOpen(true);
                }}
                onAskDelete={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(note.id);
                }}
              />
            ))}
          </div>
        )}

        <ContextMenu
          open={menu.open && !!menu.noteId}
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          onEdit={() => {
            const n = notes.find((n) => n.id === menu.noteId);
            if (n) {
              startEditModal(n);
              setModalOpen(true);
            }
          }}
          onDelete={() => {
            if (menu.noteId) setConfirmDeleteId(menu.noteId);
          }}
        />
      </section>

      <Fab
        onClick={() => {
          startCreate();
          setModalOpen(true);
        }}
      />

      <EditNoteModal
        open={modalOpen}
        draft={draft}
        setDraft={setDraft}
        onCommit={commitDraft}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDeleteDialog
        open={!!confirmDeleteId}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          deleteNote(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />

      <AppFooter />
    </main>
  );
}
