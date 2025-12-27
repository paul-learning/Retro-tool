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
  const [draft, setDraft] = useState({ title: "", text: "" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftOriginal, setDraftOriginal] = useState({ title: "", text: "" });


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
    setDraft({ title: "", text: "" });
  }, []);

  const startEditModal = useCallback((note: Note) => {
    setActiveId(note.id);
    setDraft({ title: note.title ?? "", text: note.text ?? "" });
  }, []);


const commitDraft = useCallback(async () => {
  const title = draft.title.trim();
  const text = draft.text.trim();

  // allow empty title, but body must exist (or decide your rule)
  if (!title && !text) return;

  if (activeId) {
    await updateLocalNote(activeId, title, text ); // update signature changes
  } else {
    await addLocalNote(title, text); // add signature changes
  }

  setDraft({ title: "", text: "" });
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
