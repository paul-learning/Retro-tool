"use client";

import { useEffect } from "react";

export function useAutosizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  deps: unknown[]
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";

    const max = window.innerHeight - 8 * 16; // 8rem
    el.style.height = Math.min(el.scrollHeight, max - 32) - 1 + "px";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
