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
  delete: "Delete",
  cancel: "Cancel",
  confirmDeleteBody: "Are you sure you want to delete this note? This action cannot be undone.",
  confirmDeleteTitle: "Confirm Delete",
  moreText: "...",
  notesCount: (n: number) => `${n} notes`,
} as const;
