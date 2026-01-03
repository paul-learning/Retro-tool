"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Note as DbNote } from "@/lib/notesDb";
import {
  addNote as addLocalNote,
  deleteNote as deleteLocalNote,
  listNotes,
  updateNote as updateLocalNote,
} from "@/lib/notesDb";

/**
 * We keep your DB unchanged for now:
 * - Text notes: stored as plain text in note.text
 * - Checklists: stored in note.text as a tiny marker + JSON payload
 *
 * Later, if you evolve notesDb to store "type/items" natively,
 * you can migrate without losing data.
 */

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

type NoteKind = "text" | "checklist";

export type AppNote = DbNote & {
  type: NoteKind;
};

type Draft = {
  type: NoteKind;
  title: string;
  text: string; // used for type="text"
  items: ChecklistItem[]; // used for type="checklist"
};

const CHECKLIST_MARKER = "__CHECKLIST_V1__\n";

function uid() {
  // UI-only IDs; good enough for local use
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ensureAtLeastOneItem(items: ChecklistItem[]) {
  if (items.length > 0) return items;
  return [{ id: uid(), text: "", checked: false }];
}

function encodeChecklist(items: ChecklistItem[]) {
  return CHECKLIST_MARKER + JSON.stringify({ items });
}

function tryDecodeChecklist(text: string | null | undefined): ChecklistItem[] | null {
  if (!text) return null;
  if (!text.startsWith(CHECKLIST_MARKER)) return null;

  const raw = text.slice(CHECKLIST_MARKER.length);
  try {
    const parsed = JSON.parse(raw) as { items?: ChecklistItem[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return ensureAtLeastOneItem(
      items.map((it) => ({
        id: it.id ?? uid(),
        text: (it.text ?? "").toString(),
        checked: !!it.checked,
      })),
    );
  } catch {
    return null;
  }
}

function inferType(note: DbNote): NoteKind {
  const decoded = tryDecodeChecklist(note.text);
  return decoded ? "checklist" : "text";
}

function toAppNote(note: DbNote): AppNote {
  return { ...note, type: inferType(note) };
}

function emptyDraft(kind: NoteKind): Draft {
  if (kind === "checklist") {
    return { type: "checklist", title: "", text: "", items: ensureAtLeastOneItem([]) };
  }
  return { type: "text", title: "", text: "", items: [] };
}

export function useNotes(vaultKey: CryptoKey | null) {
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("text"));
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!vaultKey) {
      setNotes([]);
      return;
    }
    const dbNotes = await listNotes(vaultKey);
    setNotes(dbNotes.map(toAppNote));
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

  /**
   * New: startCreate(kind)
   * - "text": blank title/text
   * - "checklist": blank title + one empty row
   */
  const startCreate = useCallback((kind: NoteKind = "text") => {
    setActiveId(null);
    setDraft(emptyDraft(kind));
  }, []);

  /**
   * Updated: startEditModal(note)
   * - Infers type from stored content
   * - Hydrates draft appropriately
   */
  const startEditModal = useCallback((note: DbNote) => {
    setActiveId(note.id);

    const decoded = tryDecodeChecklist(note.text);
    if (decoded) {
      setDraft({
        type: "checklist",
        title: note.title ?? "",
        text: "",
        items: ensureAtLeastOneItem(decoded),
      });
      return;
    }

    setDraft({
      type: "text",
      title: note.title ?? "",
      text: note.text ?? "",
      items: [],
    });
  }, []);

  const commitDraft = useCallback(async () => {
    if (!vaultKey) return;

    const title = (draft.title ?? "").trim();

    if (draft.type === "text") {
      const text = (draft.text ?? "").trim();
      if (!title && !text) return;

      if (activeId) {
        await updateLocalNote(vaultKey, activeId, title, text);
      } else {
        await addLocalNote(vaultKey, title, text);
      }

      setDraft(emptyDraft("text"));
      setActiveId(null);
      await loadNotes();
      return;
    }

    // checklist
    const cleanedItems = ensureAtLeastOneItem(
      (draft.items ?? []).map((it) => ({
        id: it.id ?? uid(),
        text: (it.text ?? "").toString(),
        checked: !!it.checked,
      })),
    );

    // Consider "empty checklist" if all rows are empty and no title
    const hasAnyText = cleanedItems.some((it) => it.text.trim().length > 0);
    if (!title && !hasAnyText) return;

    const payload = encodeChecklist(cleanedItems);

    if (activeId) {
      await updateLocalNote(vaultKey, activeId, title, payload);
    } else {
      await addLocalNote(vaultKey, title, payload);
    }

    setDraft(emptyDraft("checklist"));
    setActiveId(null);
    await loadNotes();
  }, [vaultKey, draft, activeId, loadNotes]);

  return useMemo(
    () => ({
      notes,
      deleteNote,

      draft,
      setDraft,
      activeId,
      startCreate,
      startEditModal,
      commitDraft,
      reload: loadNotes,
    }),
    [notes, deleteNote, draft, activeId, startCreate, startEditModal, commitDraft, loadNotes],
  );
}
