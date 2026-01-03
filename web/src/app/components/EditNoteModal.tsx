"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "../uiStrings";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

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

// ✅ Generic: works with your unified Draft as long as it has title/text.
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

  const [toolbar, setToolbar] = useState({
    bold: false,
    italic: false,
    code: false,
    link: false,
    bulletList: false,
    blockquote: false,
    h1: false,
  });

  const editor = useEditor({
    // ✅ fixes Next/Tiptap SSR hydration mismatch runtime error
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
    ],

    // initial content (we also setContent on open below)
    content: tryParseTiptapJSON(draft.text) ?? tiptapDocFromPlainText(draft.text || ""),

    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[220px] w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20",
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

  // Dirty detection snapshot
  const [originalDraft, setOriginalDraft] = useState<{ title: string; text: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    setOriginalDraft({ title: draft.title, text: draft.text });
  }, [open]); // intentionally only on open

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
  }, [open, onClose, onCommit, isDirty, linkModalOpen]);

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

  // link actions
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
      onMouseDown={() => onClose()}
    >
      <div
        className="mt-24 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0B0D12] p-4 shadow-2xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={UI.titlePlaceholder ?? "Title"}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04]
                  px-3 py-2 text-sm text-zinc-100 outline-none
                  focus:ring-4 focus:ring-indigo-500/20"
        />

        {/* Toolbar */}
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
              disabled={!canLinkNow}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onLink}
              className={
                canLinkNow ? toolBtn(toolbar.link) : toolBtn(false) + " opacity-50 cursor-not-allowed"
              }
              title="Link"
            >
              🔗
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
          </div>

          {/* tiny focus hint (optional, feels “Keep”-ish) */}
          <div className="text-[11px] text-zinc-500">{hasEditorFocus ? "Editing…" : ""}</div>
        </div>

        {/* Editor */}
        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl">
          <EditorContent editor={editor} />
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
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04]
                          px-3 py-2 text-sm text-zinc-100 outline-none
                          focus:ring-4 focus:ring-indigo-500/20"
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
            onClick={onClose}
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
