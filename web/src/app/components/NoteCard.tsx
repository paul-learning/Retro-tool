"use client";

import type { Note } from "@/lib/notesDb";
import { Pencil, Trash2 } from "lucide-react";
import { UI } from "../uiStrings";
import { ClampedBody } from "./ClampedBody";
import { Markdown } from "./Markdown";


function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
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
        <div className="px-4 pb-3 flex-1 min-h-0 overflow-hidden text-zinc-100/90">
        <div
            className="text-sm leading-relaxed"
            style={{
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical" as any,
            WebkitLineClamp: 6,
            }}
        >
            <Markdown>{note.text || ""}</Markdown>
        </div>
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
