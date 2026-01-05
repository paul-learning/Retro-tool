"use client";

import React, { useEffect, useRef, useState } from "react";
import { UI } from "../uiStrings";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

// ✅ Tables (named exports for Turbopack)
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

// ✅ Needed so right-click selects the clicked cell before we check isActive("table")
import { TextSelection } from "prosemirror-state";

function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function normalizeUrl(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  if (raw.startsWith("#")) return raw;
  if (raw.startsWith("mailto:")) return raw;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
  if (hasScheme) return raw;

  return `https://${raw.replace(/^\/+/, "")}`;
}

function tryParseTiptapJSON(s: string) {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return parsed && parsed.type === "doc" ? parsed : null;
  } catch {
    return null;
  }
}

function tiptapDocFromPlainText(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

type BaseDraft = { title: string; text: string };

export function EditNoteModal<TDraft extends BaseDraft>({
  open,
  draft,
  setDraft,
  onCommit,
  onClose,
  meta,
}: {
  open: boolean;
  draft: TDraft;
  setDraft: React.Dispatch<React.SetStateAction<TDraft>>;
  onCommit: () => void;
  onClose: () => void;
  meta: { createdAt: number; updatedAt: number } | null;
}) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [hasEditorFocus, setHasEditorFocus] = useState(false);

  // ✅ Table context menu state
  const [tableMenu, setTableMenu] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });
  const closeTableMenu = () => setTableMenu((m) => ({ ...m, open: false }));

  const [toolbar, setToolbar] = useState({
    bold: false,
    italic: false,
    code: false,
    link: false,
    bulletList: false,
    blockquote: false,
    h1: false,
    table: false,
  });

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),

      // ✅ Table support
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "tiptap-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],

    content: tryParseTiptapJSON(draft.text) ?? tiptapDocFromPlainText(draft.text || ""),

    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[220px] w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20",
      },

      // ✅ Right-click menu that ONLY triggers inside tables.
      // Important: right-click doesn't move selection by default, so we move it manually first.
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const e = event as MouseEvent;

          // Figure out the doc position at click coords
          const hit = view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (!hit) return false; // let browser menu happen

          // Move selection to where user right-clicked, then focus editor
          const tr = view.state.tr.setSelection(
            TextSelection.near(view.state.doc.resolve(hit.pos))
          );
          view.dispatch(tr);
          view.focus();

          // Now the editor's "active" state reflects the clicked cell/node
          const isInTable = !!editor?.isActive("table");
          if (!isInTable) return false; // outside table => keep browser menu

          // Inside table => suppress browser menu and open ours
          e.preventDefault();

          // Clamp menu to viewport so it doesn't go off-screen
          const MENU_W = 240;
          const MENU_H = 360;
          const pad = 8;
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          const x = Math.min(Math.max(e.clientX, pad), vw - MENU_W - pad);
          const y = Math.min(Math.max(e.clientY, pad), vh - MENU_H - pad);

          setTableMenu({ open: true, x, y });
          return true; // handled
        },
      },
    },

    onUpdate: ({ editor }) => {
      setDraft((d) => ({ ...d, text: JSON.stringify(editor.getJSON()) }));
      syncToolbar(editor);
    },
    onSelectionUpdate: ({ editor }) => syncToolbar(editor),
    onTransaction: ({ editor }) => syncToolbar(editor),

    onFocus: ({ editor }) => {
      setHasEditorFocus(true);
      syncToolbar(editor);
    },
    onBlur: ({ editor }) => {
      setHasEditorFocus(false);
      syncToolbar(editor);
    },
  });

  function syncToolbar(ed = editor) {
    if (!ed) return;

    const { state } = ed;
    const { empty, $from } = state.selection;

    const marks = empty ? state.storedMarks ?? $from.marks() : null;

    const markOn = (name: string) =>
      empty ? !!marks?.some((m) => m.type.name === name) || ed.isActive(name) : ed.isActive(name);

    const nodeOn = (name: string, attrs?: Record<string, any>) => ed.isActive(name, attrs);

    setToolbar({
      bold: markOn("bold"),
      italic: markOn("italic"),
      code: markOn("code"),
      link: markOn("link"),
      bulletList: nodeOn("bulletList"),
      blockquote: nodeOn("blockquote"),
      h1: nodeOn("heading", { level: 1 }),
      table: nodeOn("table"),
    });
  }

  // Ensure content is set when opening (without emitting update)
  const prevOpen = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (!prevOpen.current && open) {
      const content = tryParseTiptapJSON(draft.text) ?? tiptapDocFromPlainText(draft.text || "");
      editor.commands.setContent(content, { emitUpdate: false });
      requestAnimationFrame(() => syncToolbar(editor));
    }
    prevOpen.current = open;
  }, [editor, open, draft.text]);

  // Dirty snapshot
  const [originalDraft, setOriginalDraft] = useState<{ title: string; text: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    setOriginalDraft({ title: draft.title, text: draft.text });
  }, [open]); // only on open

  const isDirty =
    originalDraft !== null &&
    (draft.title !== originalDraft.title || draft.text !== originalDraft.text);

  // Escape + Ctrl/Cmd+Enter
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();

        if (linkModalOpen) {
          setLinkModalOpen(false);
          return;
        }

        if (tableMenu.open) {
          closeTableMenu();
          return;
        }

        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isDirty) return;
        onCommit();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onCommit, isDirty, linkModalOpen, tableMenu.open]);

  if (!open) return null;

  const toolBtn = (active: boolean) =>
    [
      "rounded-lg border px-2 py-1 text-xs transition",
      "border-white/10 text-zinc-200 hover:bg-white/[0.06]",
      "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
      active
        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]"
        : "bg-white/[0.03]",
    ].join(" ");

  const toolBtnDisabled = (active: boolean) =>
    toolBtn(active) + " opacity-50 cursor-not-allowed hover:bg-white/[0.03]";

  // ---- formatting actions ----
  const onBold = () => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
    requestAnimationFrame(() => syncToolbar(editor));
  };
  const onItalic = () => editor?.chain().focus().toggleItalic().run();
  const onCode = () => editor?.chain().focus().toggleCode().run();
  const onBullets = () => editor?.chain().focus().clearNodes().toggleBulletList().run();
  const onQuote = () => editor?.chain().focus().clearNodes().toggleBlockquote().run();
  const onH1 = () => editor?.chain().focus().clearNodes().toggleHeading({ level: 1 }).run();

  // ---- table insert ----
  const onInsertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    requestAnimationFrame(() => syncToolbar(editor));
  };

  const runTableCmd = (fn: () => void) => {
    fn();
    closeTableMenu();
    requestAnimationFrame(() => syncToolbar(editor));
  };

  // ---- link actions ----
  const canLinkNow = editor ? !editor.state.selection.empty : false;

  const onLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href ?? "";
    setLinkUrl(previousUrl);
    setLinkModalOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;

    const href = normalizeUrl(linkUrl);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    setLinkModalOpen(false);
    requestAnimationFrame(() => syncToolbar(editor));
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkModalOpen(false);
    requestAnimationFrame(() => syncToolbar(editor));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => {
        if (tableMenu.open) closeTableMenu();
        onClose();
      }}
    >
      <div
        className="mt-24 w-[95vw] sm:w-[90vw] lg:w-[80vw] max-w-[80vw] rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden"
        onMouseDown={(e) => {
          e.stopPropagation();
          if (tableMenu.open) closeTableMenu();
        }}
      >
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={UI.titlePlaceholder ?? "Title"}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
        />

        {/* Toolbar (kept small) */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onBold}
              className={toolBtn(toolbar.bold)}
              title="Bold (Ctrl/Cmd+B)"
            >
              B
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onItalic}
              className={toolBtn(toolbar.italic)}
              title="Italic (Ctrl/Cmd+I)"
            >
              i
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCode}
              className={toolBtn(toolbar.code)}
              title="Inline code"
            >
              {"</>"}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onBullets}
              className={toolBtn(toolbar.bulletList)}
              title="Bulleted list"
            >
              •
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onQuote}
              className={toolBtn(toolbar.blockquote)}
              title="Quote"
            >
              “”
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onH1}
              className={toolBtn(toolbar.h1)}
              title="Heading"
            >
              H
            </button>

            {/* ✅ Keep just "insert table" in main toolbar */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onInsertTable}
              className={toolBtn(false)}
              title="Insert table (3×3)"
            >
              ⊞
            </button>

            <button
              type="button"
              disabled={!canLinkNow}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onLink}
              className={canLinkNow ? toolBtn(toolbar.link) : toolBtnDisabled(false)}
              title="Link"
            >
              🔗
            </button>
          </div>

          <div className="text-[11px] text-zinc-500">{hasEditorFocus ? "Editing…" : ""}</div>
        </div>

        {/* Editor */}
        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl relative">
          <EditorContent editor={editor} />

          {/* ✅ Table context menu (opens only when right-click is inside a table) */}
          {tableMenu.open && editor && editor.isActive("table") && (
            <div
              className="fixed z-[70]"
              style={{ left: tableMenu.x, top: tableMenu.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="w-60 rounded-xl border border-white/10 bg-[#0B0D12] shadow-2xl overflow-hidden">
                <div className="px-3 py-2 text-[11px] text-zinc-400 border-b border-white/10">
                  Table options
                </div>

                <MenuItem
                  label="Add row above"
                  onClick={() => runTableCmd(() => editor.chain().focus().addRowBefore().run())}
                />
                <MenuItem
                  label="Add row below"
                  onClick={() => runTableCmd(() => editor.chain().focus().addRowAfter().run())}
                />

                <div className="h-px bg-white/10 my-1" />

                <MenuItem
                  label="Add column left"
                  onClick={() => runTableCmd(() => editor.chain().focus().addColumnBefore().run())}
                />
                <MenuItem
                  label="Add column right"
                  onClick={() => runTableCmd(() => editor.chain().focus().addColumnAfter().run())}
                />

                <div className="h-px bg-white/10 my-1" />

                <MenuItem
                  label="Delete row"
                  danger
                  onClick={() => runTableCmd(() => editor.chain().focus().deleteRow().run())}
                />
                <MenuItem
                  label="Delete column"
                  danger
                  onClick={() => runTableCmd(() => editor.chain().focus().deleteColumn().run())}
                />

                <div className="h-px bg-white/10 my-1" />

                <MenuItem
                  label="Toggle header row"
                  onClick={() => runTableCmd(() => editor.chain().focus().toggleHeaderRow().run())}
                />

                <div className="h-px bg-white/10 my-1" />

                <MenuItem
                  label="Delete table"
                  danger
                  onClick={() => runTableCmd(() => editor.chain().focus().deleteTable().run())}
                />
              </div>
            </div>
          )}
        </div>

        {meta && (
          <div className="mt-3 text-[11px] text-zinc-400 flex justify-end">
            <span>
              {meta.updatedAt === meta.createdAt
                ? `Created ${fmt(meta.createdAt)}`
                : `Edited ${fmt(meta.updatedAt)}`}
            </span>
          </div>
        )}

        {/* Link modal */}
        {linkModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onMouseDown={() => setLinkModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-semibold text-zinc-100">Add link</div>
              <div className="mt-2 text-xs text-zinc-400">
                Paste a full URL or just a domain (we’ll add https:// automatically).
              </div>

              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setLinkModalOpen(false);
                  }
                }}
              />

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={removeLink}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
                >
                  Remove
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkModalOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyLink}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (tableMenu.open) closeTableMenu();
              onClose();
            }}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
          >
            {UI.cancel}
          </button>

          <button
            disabled={!isDirty}
            onClick={() => {
              if (!isDirty) return;
              onCommit();
              onClose();
            }}
            className={
              isDirty
                ? "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                : "inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-400 cursor-not-allowed"
            }
          >
            {UI.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 text-sm transition",
        "hover:bg-white/[0.06]",
        danger ? "text-rose-300 hover:text-rose-200" : "text-zinc-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
