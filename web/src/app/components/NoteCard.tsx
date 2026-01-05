"use client";

import type { Note } from "@/lib/notesDb";
import { UI } from "../uiStrings";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

const CHECKLIST_MARKER = "__CHECKLIST_V1__\n";

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
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
  };
}

function tiptapJSONToHTML(jsonString: string): string {
  const doc = tryParseTiptapDoc(jsonString) ?? tiptapDocFromPlainText(jsonString || "");
  return generateHTML(doc, [StarterKit]);
}

function tryDecodeChecklist(text: string | null | undefined): ChecklistItem[] | null {
  if (!text) return null;
  if (!text.startsWith(CHECKLIST_MARKER)) return null;

  const raw = text.slice(CHECKLIST_MARKER.length);
  try {
    const parsed = JSON.parse(raw) as { items?: ChecklistItem[] };
    if (!parsed || !Array.isArray(parsed.items)) return [];
    return parsed.items.map((it) => ({
      id: it.id ?? "",
      text: (it.text ?? "").toString(),
      checked: !!it.checked,
    }));
  } catch {
    return null;
  }
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
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checklistItems = useMemo(() => tryDecodeChecklist(note.text), [note.text]);
  const isChecklist = checklistItems !== null;

  const previewHtml = useMemo(() => {
    if (isChecklist) return "";
    return sanitizeHTML(tiptapJSONToHTML(note.text || ""));
  }, [isChecklist, note.text]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, [previewHtml, checklistItems]);

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
        {/* ✅ Checklist preview */}
        {isChecklist ? (
          <div
            ref={bodyRef}
            className="text-sm leading-relaxed text-zinc-100/90"
            style={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical" as any,
              WebkitLineClamp: 6,
              maxHeight: "9.75rem",
            }}
          >
            {(() => {
              const items = (checklistItems ?? []).filter((it) => it.text.trim().length > 0);

              if (items.length === 0) {
                return <div className="text-zinc-400 italic">Empty checklist</div>;
              }

              const shown = items.slice(0, 6); // line clamp will cut further if needed
              const remaining = items.length - shown.length;

              return (
                <div className="space-y-1">
                  {shown.map((it, idx) => (
                    <div key={it.id || idx} className="flex items-start gap-2">
                      <span className="mt-[2px] text-zinc-300">{it.checked ? "☑" : "☐"}</span>
                      <span className={it.checked ? "text-zinc-400 line-through" : ""}>
                        {it.text}
                      </span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <div className="text-zinc-400">+ {remaining} more</div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* ✅ Text note preview (your existing Tiptap HTML preview) */
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
        )}

        {isOverflowing && (
          <>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0B0D12] to-transparent" />
            <div className="pointer-events-none absolute bottom-2 right-4 text-zinc-400">…</div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center px-2 py-2">
        <span className="px-4 items-center text-[11px] leading-4 text-zinc-400">
          {note.updatedAt === note.createdAt
            ? `Created ${fmt(note.createdAt)}`
            : `Edited ${fmt(note.updatedAt)}`}
        </span>
      </div>
    </article>
  );
}
