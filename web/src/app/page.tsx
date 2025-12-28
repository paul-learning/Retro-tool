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

import { useVault } from "./useVault";
import { VaultModal } from "./components/VaultModal";

export default function Page() {
  const vault = useVault();
  const { notes, deleteNote, draft, setDraft, activeId, startCreate, startEditModal, commitDraft } =
    useNotes(vault.vaultKey);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeMeta, setActiveMeta] = useState<{ createdAt: number; updatedAt: number } | null>(null);
  const { menu, closeMenu, openMenu } = useContextMenu();
  const [forceVaultUi, setForceVaultUi] = useState(false);
  const [setupFlow, setSetupFlow] = useState(false);

  const handleCommit = async () => {
    await commitDraft();
    if (activeId && activeMeta) {
      setActiveMeta({ ...activeMeta, updatedAt: Date.now() });
    }
  };

  const needsVaultUi =
    forceVaultUi ||
    setupFlow ||
    vault.status === "needs-setup" ||
    vault.status === "locked";


  return (
    <main className="min-h-screen bg-[#0B0D12] text-zinc-100">
      {/* vault gate */}
      {needsVaultUi && (
        <VaultModal
          mode={setupFlow || vault.status === "needs-setup" ? "setup" : "unlock"}
          onSetup={async (passphrase) => {
            setSetupFlow(true);            // keep mode="setup"
            const res = await vault.setupVault(passphrase);
            setForceVaultUi(true);         // keep modal mounted for recovery screen
            return res;
          }}
          onUnlockPassphrase={vault.unlockWithPassphrase}
          onUnlockRecovery={vault.unlockWithRecoveryKey}
          onRecoveryDone={() => {
            setForceVaultUi(false);
            setSetupFlow(false);           // now allow normal "unlock" mode logic
          }}
        />
      )}

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
                  setActiveMeta({ createdAt: note.createdAt, updatedAt: note.updatedAt });
                  setModalOpen(true);
                }}
                onContextMenu={(e) => openMenu(e, note.id)}
                onEditClick={(e) => {
                  e.stopPropagation();
                  startEditModal(note);
                  setActiveMeta({ createdAt: note.createdAt, updatedAt: note.updatedAt });
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
              setActiveMeta({ createdAt: n.createdAt, updatedAt: n.updatedAt });
              setModalOpen(true);
            }
          }}
          onDelete={() => {
            if (menu.noteId) setConfirmDeleteId(menu.noteId);
          }}
        />
      </section>

      <Fab
        ariaLabel= {UI.ariaLabelFab}
        onClick={() => {
          startCreate();
          setActiveMeta(null);
          setModalOpen(true);
        }}
      />


      <EditNoteModal
        open={modalOpen}
        draft={draft}
        setDraft={setDraft}
        onCommit={handleCommit}
        onClose={() => setModalOpen(false)}
        meta={activeMeta}
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
