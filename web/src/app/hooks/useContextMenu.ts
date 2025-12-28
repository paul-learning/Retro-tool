"use client";

import { useCallback, useState } from "react";

export type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  noteId: string | null;
};

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    noteId: null,
  });

  const closeMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false, noteId: null }));
  }, []);

  const openMenu = useCallback((e: React.MouseEvent, noteId: string) => {
    // IMPORTANT: keep your existing behavior
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY, noteId });
  }, []);

  return { menu, openMenu, closeMenu, setMenu };
}
