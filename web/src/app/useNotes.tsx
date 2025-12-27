"use client";

import { useCallback, useEffect, useState } from "react";
import type { Note } from "@/lib/notesDb";
import {
  addNote as addLocalNote,
  deleteNote as deleteLocalNote,
  listNotes,
  updateNote as updateLocalNote,
} from "@/lib/notesDb";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftOriginal, setDraftOriginal] = useState("");


  const loadNotes = useCallback(async () => {
    setNotes(await listNotes());
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const deleteNote = useCallback(async (id: string) => {
    await deleteLocalNote(id);
    await loadNotes();
  }, [loadNotes]);

  const startCreate = useCallback(() => {
  setActiveId(null);
  setDraft("");
  setDraftOriginal("");
}, []);

const startEditModal = useCallback((note: Note) => {
  setActiveId(note.id);
  setDraft(note.text);
  setDraftOriginal(note.text);
}, []);

const commitDraft = useCallback(async () => {
  const value = draft.trim();
  // If editing and nothing changed: close/reset without DB write or reload
  if (activeId && value === draftOriginal.trim()) {
    setDraft("");
    setDraftOriginal("");
    setActiveId(null);
    return;
  }
  if (!value) return;

  if (activeId) {
    await updateLocalNote(activeId, value);
  } else {
    await addLocalNote(value);
  }

  setDraft("");
  setDraftOriginal("");
  setActiveId(null);
  await loadNotes();
}, [draft, activeId, loadNotes]);

return {
  notes,
  deleteNote,

  // modal draft API
  draft,
  setDraft,
  activeId,
  startCreate,
  startEditModal,
  commitDraft,

};

}
