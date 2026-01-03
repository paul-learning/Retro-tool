"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UI } from "../uiStrings";

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

// internal: remembers where an item was among UNCHECKED items when it got checked
type PinMap = Record<string, number>;

type BaseChecklistDraft = {
  title: string;
  items: ChecklistItem[];
};

function fmt(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeItems(items: ChecklistItem[]) {
  if (items && items.length) {
    return items.map((it) => ({
      id: it.id ?? uid(),
      text: (it.text ?? "").toString(),
      checked: !!it.checked,
    }));
  }
  return [{ id: uid(), text: "", checked: false }];
}

// render order: unchecked first, then checked (stable within groups)
function sortKeepStyle(items: ChecklistItem[]) {
  const unchecked: ChecklistItem[] = [];
  const checked: ChecklistItem[] = [];
  for (const it of items) (it.checked ? checked : unchecked).push(it);
  return [...unchecked, ...checked];
}

export function EditChecklistModal<TDraft extends BaseChecklistDraft>({
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
  // UI: keep-style ordering
  const items = useMemo(() => sortKeepStyle(normalizeItems(draft.items)), [draft.items]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [originalDraft, setOriginalDraft] = useState<TDraft | null>(null);

  // ✅ remembers “old unchecked position” while modal is open
  const [restoreIndex, setRestoreIndex] = useState<PinMap>({});

  // ✅ small per-row popover (id of row whose handle menu is open)
  const [reorderMenuFor, setReorderMenuFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setOriginalDraft({
      ...draft,
      items: normalizeItems(draft.items),
    });

    setDraft((d) => ({
      ...d,
      items: normalizeItems(d.items),
    }));

    setRestoreIndex({});
    setReorderMenuFor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDirty = useMemo(() => {
    if (!originalDraft) return false;

    if (draft.title !== originalDraft.title) return true;

    const a = normalizeItems(draft.items);
    const b = normalizeItems(originalDraft.items);

    if (a.length !== b.length) return true;

    for (let i = 0; i < a.length; i++) {
      if (a[i].text !== b[i].text) return true;
      if (a[i].checked !== b[i].checked) return true;
    }
    return false;
  }, [draft, originalDraft]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setReorderMenuFor(null);
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
  }, [open, onClose, onCommit, isDirty]);

  if (!open) return null;

  const setItem = (id: string, patch: Partial<ChecklistItem>) => {
    setDraft((d) => ({
      ...d,
      items: normalizeItems(d.items).map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const addItemAfter = (afterId?: string) => {
    const newId = uid();

    setDraft((d) => {
      const current = normalizeItems(d.items);

      if (!afterId) {
        return { ...d, items: [...current, { id: newId, text: "", checked: false }] };
      }

      const idx = current.findIndex((x) => x.id === afterId);
      const next = [...current];
      next.splice(idx + 1, 0, { id: newId, text: "", checked: false });
      return { ...d, items: next };
    });

    requestAnimationFrame(() => {
      inputRefs.current[newId]?.focus();
    });
  };

  const removeItem = (id: string) => {
    setDraft((d) => {
      const current = normalizeItems(d.items);
      const idx = current.findIndex((x) => x.id === id);
      const next = current.filter((x) => x.id !== id);
      const ensured = next.length ? next : [{ id: uid(), text: "", checked: false }];

      requestAnimationFrame(() => {
        const target =
          ensured[Math.max(0, Math.min(idx - 1, ensured.length - 1))]?.id ?? ensured[0].id;
        inputRefs.current[target]?.focus();
      });

      return { ...d, items: ensured };
    });

    setRestoreIndex((m) => {
      const { [id]: _, ...rest } = m;
      return rest;
    });
    setReorderMenuFor((v) => (v === id ? null : v));
  };

  /**
   * ✅ 1) Keep behavior with "restore old position" when unchecking.
   *
   * - When checking: remember index among unchecked items (in current UI order).
   * - When unchecking: insert back into unchecked section at remembered index.
   */
  const toggleCheckedKeepRestore = (id: string) => {
    setDraft((d) => {
      const current = normalizeItems(d.items);
      const idx = current.findIndex((x) => x.id === id);
      if (idx === -1) return d;

      const item = current[idx];
      const willBeChecked = !item.checked;

      // Compute current render order for stable "unchecked index"
      const rendered = sortKeepStyle(current);
      const uncheckedRendered = rendered.filter((x) => !x.checked);
      const uncheckedIndexNow = uncheckedRendered.findIndex((x) => x.id === id);

      // When checking, store the old unchecked index
      if (willBeChecked) {
        setRestoreIndex((m) => ({
          ...m,
          [id]: uncheckedIndexNow === -1 ? uncheckedRendered.length : uncheckedIndexNow,
        }));
      }

      const updated: ChecklistItem = { ...item, checked: willBeChecked };
      const without = current.filter((x) => x.id !== id);

      // Split without into groups (in CURRENT underlying order)
      const unchecked = without.filter((x) => !x.checked);
      const checked = without.filter((x) => x.checked);

      let next: ChecklistItem[];

      if (willBeChecked) {
        // checked goes to bottom of checked group (like Keep)
        next = [...unchecked, ...checked, updated];
      } else {
        // unchecking: restore into unchecked at previous index
        const desired = restoreIndex[id];
        const insertAt =
          typeof desired === "number"
            ? Math.max(0, Math.min(desired, unchecked.length))
            : unchecked.length; // fallback

        next = [...unchecked.slice(0, insertAt), updated, ...unchecked.slice(insertAt), ...checked];

        // cleanup stored index once used
        setRestoreIndex((m) => {
          const { [id]: _, ...rest } = m;
          return rest;
        });
      }

      requestAnimationFrame(() => {
        inputRefs.current[id]?.focus();
      });

      return { ...d, items: next };
    });
  };

  /**
   * ✅ 2) Manual reorder within the visible order.
   * We move in *rendered* order (unchecked first then checked),
   * then write back a new underlying order that keeps "unchecked then checked".
   */
  const moveInRenderedOrder = (id: string, dir: "up" | "down") => {
    setDraft((d) => {
      const current = normalizeItems(d.items);
      const rendered = sortKeepStyle(current);
      const i = rendered.findIndex((x) => x.id === id);
      if (i === -1) return d;

      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= rendered.length) return d;

      // Swap in rendered list
      const swapped = [...rendered];
      const tmp = swapped[i];
      swapped[i] = swapped[j];
      swapped[j] = tmp;

      // Now rebuild underlying list as "unchecked then checked" in this swapped order
      const nextUnchecked = swapped.filter((x) => !x.checked);
      const nextChecked = swapped.filter((x) => x.checked);
      const next = [...nextUnchecked, ...nextChecked];

      requestAnimationFrame(() => inputRefs.current[id]?.focus());
      return { ...d, items: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={() => {
        setReorderMenuFor(null);
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

        <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="p-2">
            {items.map((it, idx) => {
              const isEmpty = !it.text.trim();
              const isMenuOpen = reorderMenuFor === it.id;

              return (
                <div
                  key={it.id}
                  className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/[0.04] relative"
                >
                  <button
                    type="button"
                    aria-label={it.checked ? "Uncheck item" : "Check item"}
                    onClick={() => toggleCheckedKeepRestore(it.id)}
                    className={[
                      "h-5 w-5 rounded border transition flex items-center justify-center",
                      it.checked
                        ? "border-indigo-400/60 bg-indigo-500/20"
                        : "border-white/15 bg-white/[0.02]",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                    ].join(" ")}
                  >
                    {it.checked ? "✓" : ""}
                  </button>

                  <input
                    ref={(el) => {
                      inputRefs.current[it.id] = el;
                    }}
                    value={it.text}
                    onChange={(e) => setItem(it.id, { text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItemAfter(it.id);
                      }

                      if (e.key === "Backspace" && isEmpty && items.length > 1) {
                        e.preventDefault();
                        removeItem(it.id);
                      }

                      if (e.key === "ArrowUp") {
                        const prev = items[idx - 1];
                        if (prev) {
                          e.preventDefault();
                          inputRefs.current[prev.id]?.focus();
                        }
                      }
                      if (e.key === "ArrowDown") {
                        const next = items[idx + 1];
                        if (next) {
                          e.preventDefault();
                          inputRefs.current[next.id]?.focus();
                        }
                      }
                    }}
                    placeholder={idx === 0 ? "List item…" : ""}
                    className={[
                      "flex-1 rounded-lg border border-white/0 bg-transparent px-2 py-1 text-sm outline-none",
                      "focus:border-white/10 focus:bg-white/[0.02] focus:ring-2 focus:ring-indigo-500/20",
                      it.checked ? "text-zinc-400 line-through" : "text-zinc-100",
                    ].join(" ")}
                  />

                  {/* ✅ NEW: reorder handle (three stacked lines) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setReorderMenuFor((v) => (v === it.id ? null : it.id))}
                      className="opacity-0 group-hover:opacity-100 transition text-zinc-300 hover:text-white rounded-lg px-2 py-1"
                      title="Reorder"
                      aria-label="Reorder"
                    >
                      ≡
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-10 rounded-xl border border-white/10 bg-[#0B0D12] shadow-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => moveInRenderedOrder(it.id, "up")}
                          className="w-full px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] text-left"
                        >
                          ↑ Move up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveInRenderedOrder(it.id, "down")}
                          className="w-full px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06] text-left"
                        >
                          ↓ Move down
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addItemAfter(it.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-zinc-300 hover:text-white rounded-lg px-2 py-1"
                    title="Add item"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      items.length > 1 ? removeItem(it.id) : setItem(it.id, { text: "", checked: false })
                    }
                    className="opacity-0 group-hover:opacity-100 transition text-zinc-300 hover:text-white rounded-lg px-2 py-1"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
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
          <button
            onClick={() => {
              setReorderMenuFor(null);
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
