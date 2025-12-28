// src/app/useNotes.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Note } from "@/lib/notesDb";
import {
  addNote as addLocalNote,
  deleteNote as deleteLocalNote,
  listNotes,
  updateNote as updateLocalNote,
} from "@/lib/notesDb";

export function useNotes(vaultKey: CryptoKey | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState({ title: "", text: "" });
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!vaultKey) {
      setNotes([]);
      return;
    }
    setNotes(await listNotes(vaultKey));
  }, [vaultKey]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const deleteNote = useCallback(
    async (id: string) => {
      await deleteLocalNote(id);
      await loadNotes();
    },
    [loadNotes],
  );

  const startCreate = useCallback(() => {
    setActiveId(null);
    setDraft({ title: "", text: "" });
  }, []);

  const startEditModal = useCallback((note: Note) => {
    setActiveId(note.id);
    setDraft({ title: note.title ?? "", text: note.text ?? "" });
  }, []);

  const commitDraft = useCallback(async () => {
    if (!vaultKey) return;

    const title = draft.title.trim();
    const text = draft.text.trim();

    if (!title && !text) return;

    if (activeId) {
      await updateLocalNote(vaultKey, activeId, title, text);
    } else {
      await addLocalNote(vaultKey, title, text);
    }

    setDraft({ title: "", text: "" });
    setActiveId(null);
    await loadNotes();
  }, [vaultKey, draft, activeId, loadNotes]);

  return {
    notes,
    deleteNote,

    draft,
    setDraft,
    activeId,
    startCreate,
    startEditModal,
    commitDraft,
    reload: loadNotes,
  };
}
