"use client";

import React, { useRef, useState } from "react";
import { UI } from "../uiStrings";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

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
  try {
    const j = JSON.parse(s);
    if (j && typeof j === "object") return j;
  } catch {}
  return null;
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

/* ---------------- Slash Command Extension ---------------- */

type SlashItem = {
  title: string;
  keywords: string[];
  command: (opts: { editor: any }) => void;
};

const SlashCommand = Extension.create({
  name: "slash-command",
  addProseMirrorPlugins() {
    const items: SlashItem[] = [
      {
        title: "Heading 1",
        keywords: ["h1", "heading", "title"],
        command: ({ editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        title: "Bulleted list",
        keywords: ["bullet", "bullets", "list", "ul"],
        command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
      },
      {
        title: "Quote",
        keywords: ["quote", "blockquote"],
        command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        title: "Code block",
        keywords: ["code", "codeblock"],
        command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        title: "Divider",
        keywords: ["divider", "hr", "rule"],
        command: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        title: "Table (3×3)",
        keywords: ["table", "grid"],
        command: ({ editor }) =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ];

    let popup: HTMLDivElement | null = null;

    const ensurePopup = () => {
      if (popup) return popup;
      popup = document.createElement("div");
      popup.className =
        "z-[80] rounded-xl border border-white/10 bg-[#0B0D12] shadow-2xl p-1 text-sm";
      document.body.appendChild(popup);
      return popup;
    };

    const destroyPopup = () => {
      popup?.remove();
      popup = null;
    };

    type RenderProps = {
      items: SlashItem[];
      command: (item: SlashItem) => void;
      clientRect?: (() => DOMRect | null) | null;
    };

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }: { query: string }) => {
          const q = query.trim().toLowerCase();
          if (!q) return items;
          return items.filter((it) => {
            if (it.title.toLowerCase().includes(q)) return true;
            return it.keywords.some((k) => k.includes(q));
          });
        },
        command: ({ editor, props }: { editor: any; props: SlashItem }) => {
          props.command({ editor });
        },
        render: () => {
          const updatePopup = (props: RenderProps) => {
            const el = ensurePopup();
            el.innerHTML = "";

            props.items.forEach((item) => {
              const row = document.createElement("button");
              row.type = "button";
              row.className =
                "w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-200";
              row.textContent = item.title;
              row.onmousedown = (e) => e.preventDefault();
              row.onclick = () => props.command(item);
              el.appendChild(row);
            });

            const rect = props.clientRect?.();
            if (!rect) return;

            el.style.position = "fixed";
            el.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
            el.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 200)}px`;
            el.style.minWidth = "220px";
            el.style.display = "block";
          };

          return {
            onStart: (props: RenderProps) => {
              ensurePopup();
              updatePopup(props);
            },
            onUpdate: (props: RenderProps) => {
              updatePopup(props);
            },
            onExit: () => {
              destroyPopup();
            },
          };
        },

      }),
    ];
  },
});

/* ---------------- Component ---------------- */

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

  // Bubble menu state (selection-based)
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number }>({
    open: false,
    x: 0,
    y: 0,
  });

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
    h1: false,
    bullets: false,
    quote: false,
    codeBlock: false,
    table: false,
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      SlashCommand,
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
          "tiptap h-full w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20",
      },

      // ✅ Right-click menu that ONLY triggers inside tables.
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const e = event as MouseEvent;

          const hit = view.posAtCoords({ left: e.clientX, top: e.clientY });
          if (!hit) return false; // let browser menu happen

          const tr = view.state.tr.setSelection(
            TextSelection.near(view.state.doc.resolve(hit.pos))
          );
          view.dispatch(tr);
          view.focus();

          // Only open our menu if inside a table
          const ed = editor;
          if (!ed) return false;
          if (!ed.isActive("table")) return false;

          e.preventDefault();
          setTableMenu({ open: true, x: e.clientX, y: e.clientY });
          return true;
        },
      },
    },

    onUpdate: ({ editor }) => {
      setDraft((d) => ({ ...d, text: JSON.stringify(editor.getJSON()) }));
      syncToolbar(editor);
      syncBubble(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      syncToolbar(editor);
      syncBubble(editor);
    },
    onTransaction: ({ editor }) => {
      syncToolbar(editor);
      syncBubble(editor);
    },

    onFocus: ({ editor }) => {
      setHasEditorFocus(true);
      syncToolbar(editor);
      syncBubble(editor);
    },
    onBlur: ({ editor }) => {
      setHasEditorFocus(false);
      setBubble({ open: false, x: 0, y: 0 });
      syncToolbar(editor);
    },
  });

  function syncToolbar(ed = editor) {
    if (!ed) return;

    const { state } = ed;
    const { empty, $from } = state.selection;

    const marks = empty ? state.storedMarks ?? $from.marks() : null;
    const hasMark = (name: string) =>
      (marks ? marks.some((m) => m.type.name === name) : ed.isActive(name)) ?? false;

    setToolbar({
      bold: hasMark("bold"),
      italic: hasMark("italic"),
      code: hasMark("code"),
      link: ed.isActive("link"),
      h1: ed.isActive("heading", { level: 1 }),
      bullets: ed.isActive("bulletList"),
      quote: ed.isActive("blockquote"),
      codeBlock: ed.isActive("codeBlock"),
      table: ed.isActive("table"),
    });
  }

  function syncBubble(ed = editor) {
    if (!ed) return;
    const { state, view } = ed;
    const { from, to, empty } = state.selection;

    // Only show when focused + non-empty selection
    if (!hasEditorFocus || empty || from === to) {
      setBubble((b) => (b.open ? { open: false, x: 0, y: 0 } : b));
      return;
    }

    try {
      const a = view.coordsAtPos(from);
      const b = view.coordsAtPos(to);
      const x = (a.left + b.right) / 2;
      const y = Math.min(a.top, b.top) - 10; // above selection
      setBubble({ open: true, x, y });
    } catch {
      setBubble({ open: false, x: 0, y: 0 });
    }
  }

  const toolBtn = (active: boolean) =>
    [
      "rounded-lg border px-2 py-1 text-xs transition",
      "border-white/10 text-zinc-200 hover:bg-white/[0.06]",
      "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
      active
        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]"
        : "",
    ].join(" ");

  const toolBtnDisabled =
    "rounded-lg border px-2 py-1 text-xs transition border-white/10 text-zinc-400 opacity-50 cursor-not-allowed hover:bg-white/[0.03]";

  // ---- formatting actions ----
  const onBold = () => {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
    requestAnimationFrame(() => syncToolbar(editor));
  };
  const onItalic = () => editor?.chain().focus().toggleItalic().run();
  const onCode = () => editor?.chain().focus().toggleCode().run();

  const canLinkNow = editor ? !editor.state.selection.empty : false;

  const onLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href ?? "";
    setLinkUrl(previousUrl);
    setLinkModalOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const url = normalizeUrl(linkUrl);
    if (!url) {
      editor.chain().focus().unsetLink().run();
      setLinkModalOpen(false);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkModalOpen(false);
    syncToolbar(editor);
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setLinkModalOpen(false);
    syncToolbar(editor);
  };

  const MenuItem = ({
    label,
    onClick,
    danger,
  }: {
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 text-sm rounded-lg transition",
        danger ? "text-rose-200 hover:bg-rose-500/10" : "text-zinc-200 hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const runTableCmd = (fn: () => void) => {
    if (!editor) return;
    closeTableMenu();
    requestAnimationFrame(() => {
      fn();
      syncToolbar(editor);
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 pt-10">

      <div
        className="w-[95vw] sm:w-[90vw] lg:w-[80vw] max-w-[80vw] h-[80vh] rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl flex flex-col overflow-hidden"
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

        {/* ✅ Editor fills remaining modal height */}
        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-xl relative flex">
          {/* Bubble menu (selection-based) */}
          {editor && bubble.open && (
            <div
              className="fixed z-[75] -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-[#0B0D12] p-1 shadow-2xl"
              style={{ left: bubble.x, top: bubble.y }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-1">
                <button type="button" onClick={onBold} className={toolBtn(toolbar.bold)} title="Bold (Ctrl/Cmd+B)">
                  <b>B</b>
                </button>
                <button type="button" onClick={onItalic} className={toolBtn(toolbar.italic)} title="Italic (Ctrl/Cmd+I)">
                  <i>I</i>
                </button>
                <button type="button" onClick={onCode} className={toolBtn(toolbar.code)} title="Inline code">
                  {"</>"}
                </button>
                <button
                  type="button"
                  disabled={!canLinkNow}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onLink}
                  className={canLinkNow ? toolBtn(toolbar.link) : toolBtnDisabled}
                  title="Link"
                >
                  🔗
                </button>
              </div>
            </div>
          )}

          {/* Scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <EditorContent editor={editor} className="h-full" />
          </div>

          {/* ✅ Table context menu (opens only when right-click is inside a table) */}
          {tableMenu.open && editor && editor.isActive("table") && (
            <div className="fixed z-[70]" style={{ left: tableMenu.x, top: tableMenu.y }}>
              <div className="w-56 rounded-xl border border-white/10 bg-[#0B0D12] shadow-2xl p-1">
                <MenuItem
                  label="Add row below"
                  onClick={() => runTableCmd(() => editor.chain().focus().addRowAfter().run())}
                />
                <MenuItem
                  label="Add column right"
                  onClick={() => runTableCmd(() => editor.chain().focus().addColumnAfter().run())}
                />
                <MenuItem
                  label="Delete row"
                  onClick={() => runTableCmd(() => editor.chain().focus().deleteRow().run())}
                />
                <MenuItem
                  label="Delete column"
                  onClick={() => runTableCmd(() => editor.chain().focus().deleteColumn().run())}
                />
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
          <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-3">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl">
              <div className="text-sm text-zinc-100 mb-2">Add / Edit link</div>

              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
              />

              <div className="mt-3 flex items-center justify-between gap-2">
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
                    className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-100 hover:bg-indigo-500/25"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons (kept since your component expects onCommit/onClose) */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onCommit}
            className="rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-100 hover:bg-indigo-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
