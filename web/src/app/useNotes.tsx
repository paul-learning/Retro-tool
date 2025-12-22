"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/notesDb";
import {
  addNote as addLocalNote,
  deleteNote as deleteLocalNote,
  listNotes,
  updateNote as updateLocalNote,
} from "@/lib/notesDb";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  // EDIT STATE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

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
      // If deleting the one being edited, exit edit mode
      if (editingId === id) {
        setEditingId(null);
        setEditingText("");
      }
      await deleteLocalNote(id);
      await loadNotes();
    },
    [loadNotes, editingId]
  );

  // Start editing: set state and focus the editor (Page will attach the ref)
  const startEdit = useCallback((note: Note) => {
    setEditingId(note.id);
    setEditingText(note.text);
  }, []);

  // Call this after the editor is mounted
  const focusEditor = useCallback(() => {
    // next tick so the textarea exists
    queueMicrotask(() => {
      editorRef.current?.focus();
      // put cursor at end (nice UX)
      const el = editorRef.current;
      if (el) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText("");
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingId) return;

    const value = editingText.trim();
    // If they delete everything, you can choose behavior:
    // - either do nothing
    // - or delete note
    // First iteration: don't allow empty commits.
    if (!value) return;

    await updateLocalNote(editingId, value);
    setEditingId(null);
    setEditingText("");
    await loadNotes();
  }, [editingId, editingText, loadNotes]);

  return {
    notes,
    text,
    setText,
    addNote,
    deleteNote,

    // editing API
    editingId,
    editingText,
    setEditingText,
    startEdit,
    focusEditor,
    cancelEdit,
    commitEdit,
    editorRef,
  };
}
