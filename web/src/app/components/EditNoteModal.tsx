"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "../uiStrings";
import { useAutosizeTextarea } from "../hooks/useAutosizeTextarea";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";



function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
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


export function EditNoteModal({
  open,
  draft,
  setDraft,
  onCommit,
  onClose,
  meta,
}: {
  open: boolean;
  draft: { title: string; text: string };
  setDraft: React.Dispatch<React.SetStateAction<{ title: string; text: string }>>;
  onCommit: () => void;
  onClose: () => void;
  meta: { createdAt: number; updatedAt: number } | null;
}) {
const [, forceRerender] = useState(0);
const editor = useEditor({
  immediatelyRender: false,
  extensions: [StarterKit],
  content:
    tryParseTiptapJSON(draft.text) ?? tiptapDocFromPlainText(draft.text || ""),
  editorProps: {
    attributes: {
      class:
        "tiptap min-h-[220px] w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20",
    },
  },
  onUpdate: ({ editor }) => {
    setDraft((d) => ({ ...d, text: JSON.stringify(editor.getJSON()) }));
  },
  onSelectionUpdate: () => forceRerender((x) => x + 1),
  onTransaction: () => forceRerender((x) => x + 1),
});
const prevOpen = useRef(false);

useEffect(() => {
  if (!editor) return;

  if (!prevOpen.current && open) {
    const content =
      tryParseTiptapJSON(draft.text) ?? tiptapDocFromPlainText(draft.text || "");
    editor.commands.setContent(content, { emitUpdate: false });
  }

  prevOpen.current = open;
}, [editor, open]); 

  const [originalDraft, setOriginalDraft] = useState<{ title: string; text: string } | null>(null);


  // Auto-focus textarea on open (restores “Escape works while typing” feel too)

    useEffect(() => {
    if (!open) return;


    // Snapshot draft when modal opens
    setOriginalDraft({
        title: draft.title,
        text: draft.text,
    });
    }, [open]);


    const isDirty =
        originalDraft !== null &&
        (draft.title !== originalDraft.title || draft.text !== originalDraft.text);

 // Global keyboard handling (Escape + Ctrl/Cmd+Enter)
useEffect(() => {
  if (!open) return;

  function onKeyDown(e: KeyboardEvent) {
    // Escape = cancel
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    // Ctrl/Cmd + Enter = save (only if dirty)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isDirty) return;
      onCommit();
      onClose();
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [open, onClose, onCommit, isDirty]);
       
  if (!open) return null;
/* button handlers */
const bump = () => forceRerender((x) => x + 1);

const onBold = () => {
  editor?.chain().focus().toggleBold().run();
  bump();
};
const onItalic = () => {
  editor?.chain().focus().toggleItalic().run();
  bump();
};
const onStrike = () => {
  editor?.chain().focus().toggleStrike().run();
  bump();
};
const onBullets = () => {
  editor?.chain().focus().clearNodes().toggleBulletList().run();
  bump();
};
const onOrderedList = () => {
  editor?.chain().focus().toggleOrderedList().run();
  bump();
};
const onQuote = () => {
  editor?.chain().focus().clearNodes().toggleBlockquote().run();
  bump();
};
const onCode = () => {
  editor?.chain().focus().toggleCode().run();
  bump();
};
const onCodeBlock = () => {
  editor?.chain().focus().toggleCodeBlock().run();
  bump();
};
const onH1 = () => {
  editor?.chain().focus().clearNodes().toggleHeading({ level: 1 }).run();
  bump();
};

const toolBtn = (active: boolean) =>
  [
    "rounded-lg border px-2 py-1 text-xs transition",
    "border-white/10 text-zinc-200 hover:bg-white/[0.06]",
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",

    // background + text color: choose ONE set
    active
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : "bg-white/[0.03]",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => {
        onClose();
      }}
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
        <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBold}
            className={toolBtn(!!editor?.isActive("bold"))}
            title="Bold (Ctrl/Cmd+B)"
            >
            B
            </button>

            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onItalic}
            className={toolBtn(!!editor?.isActive("italic"))}
            title="Italic (Ctrl/Cmd+I)"
            >
            i
            </button>

            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCode}
            className={toolBtn(!!editor?.isActive("code"))}
            title="Inline code"
            >
            {"</>"}
            </button>
            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBullets}
            className={toolBtn(!!editor?.isActive("bulletList"))}
            title="Bulleted list"
            >
            •
            </button>

            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onQuote}
            className={toolBtn(!!editor?.isActive("blockquote"))}
            title="Quote"
            >
            “”
            </button>

            <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onH1}
            className={toolBtn(!!editor?.isActive("heading", { level: 1 }))}
            title="Heading"
            >
            H
            </button>
        </div>
        </div>

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

        <div className="mt-4 flex items-center justify-between">
            {/* Cancel */}
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
