"use client";

import { useCallback, useEffect, useState } from "react";
import type { Note } from "@/lib/notesDb";
import {
  addNote as addLocalNote,
  deleteNote as deleteLocalNote,
  listNotes,
} from "@/lib/notesDb";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  const loadNotes = useCallback(async () => {
    setNotes(await listNotes());
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async () => {
    const value = text.trim();
    if (!value) return;

    await addLocalNote(value);
    setText("");
    await loadNotes();
  }, [text, loadNotes]);

  const deleteNote = useCallback(
    async (id: string) => {
      await deleteLocalNote(id);
      await loadNotes();
    },
    [loadNotes]
  );

  return { notes, text, setText, addNote, deleteNote, reload: loadNotes };
}
