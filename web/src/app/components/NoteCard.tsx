"use client";

import type { Note } from "@/lib/notesDb";
import { Pencil, Trash2 } from "lucide-react";
import { UI } from "../uiStrings";
import { useEffect, useRef, useState } from "react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";



function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}
function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

function tryParseTiptapDoc(jsonString: string) {
  if (!jsonString) return null;
  try {
    const doc = JSON.parse(jsonString);
    return doc && doc.type === "doc" ? doc : null;
  } catch {
    return null;
  }
}

function tiptapDocFromPlainText(text: string) {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
    ],
  };
}

function tiptapJSONToHTML(jsonString: string): string {
  const doc = tryParseTiptapDoc(jsonString) ?? tiptapDocFromPlainText(jsonString || "");
  return generateHTML(doc, [StarterKit]);
}




export function NoteCard({
  note,
  onOpen,
  onAskDelete,
  onContextMenu,
  onEditClick,
}: {
  note: Note;
  onOpen: () => void;
  onEditClick: (e: React.MouseEvent) => void;
  onAskDelete: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
const previewHtml = sanitizeHTML(
  tiptapJSONToHTML(note.text || "")
);



  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () => {
      // small epsilon avoids off-by-1 from subpixel layout
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    measure();

    // Re-measure on resize (card width changes => line breaks change)
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, [previewHtml]);
  return (
    <article
      key={note.id}
      onClick={onOpen}
      onContextMenu={onContextMenu}
        className="group cursor-text rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_50px_rgba(0,0,0,0.35)] transition hover:border-white/15 hover:bg-white/[0.06] h-48 flex flex-col"

    >
      <div className="px-4 pt-4 pb-2 overflow-hidden font-semibold text-zinc-100">
        {note.title || UI.untitled}
      </div>
      <div className="relative px-4 pb-3 flex-1 min-h-0 overflow-hidden">
        <div
          ref={bodyRef}
          className="tiptapPreview text-sm leading-relaxed text-zinc-100/90"
          style={{
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical" as any,
            WebkitLineClamp: 6,
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

      {isOverflowing && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0B0D12] to-transparent" />
          <div className="pointer-events-none absolute bottom-2 right-4 text-zinc-400">…</div>
        </>
      )}
    </div>



      <div className="flex items-center justify-center px-2 py-2">
       {/* <button
          onClick={onEditClick}
          aria-label={UI.ariaEditNote}
          title={UI.titleEdit}
          className="
            inline-flex items-center justify-center
            rounded-lg
            border border-white/10
            bg-white/[0.03]
            p-1
            text-zinc-400
            transition
            hover:bg-white/[0.06]
            hover:text-zinc-200
            focus:outline-none
            focus:ring-2
            focus:ring-indigo-500/20
          "
        >
          <Pencil className="h-4 w-4" />
        </button> */}
        <span className="px-4 items-center text-[11px] leading-4 text-zinc-400">
        {note.updatedAt === note.createdAt
            ? `Created ${fmt(note.createdAt)}`
            : `Edited ${fmt(note.updatedAt)}`}
        </span>
        {/*
        <button
          onClick={onAskDelete}
          aria-label={UI.ariaDeleteNote}
          title={UI.titleDelete}
          className="
            inline-flex items-center justify-center
            rounded-lg
            border border-white/10
            bg-white/[0.03]
            p-1
            text-zinc-400
            transition
            hover:bg-white/[0.06]
            hover:text-zinc-200
            focus:outline-none
            focus:ring-2
            focus:ring-red-500/20
          "
        >
          <Trash2 className="h-4 w-4" />
        </button>*/}
      </div>
    </article>
  );
}
