export const UI = {
  headerTitle: "Your Notes",
  keyboardHint: "⌘/Ctrl + Enter",

  emptyStateTitle: "No notes yet",
  emptyStateBody: "Add your first note below.",

  menuEdit: "Edit",
  menuDelete: "Delete",

  ariaEditNote: "Edit note",
  ariaDeleteNote: "Delete note",

  titleEdit: "Edit",
  titleDelete: "Delete",
  notesCount: (n: number) => `${n} notes`,
} as const;
