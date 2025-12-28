export const UI = {
  headerTitle: "Your Notes",
  keyboardHint: "⌘/Ctrl + Enter",

  emptyStateTitle: "No notes yet",
  emptyStateBody: "Add your first note below with the +.",

  menuEdit: "Edit",
  menuDelete: "Delete",

  ariaEditNote: "Edit note",
  ariaDeleteNote: "Delete note",

  titleEdit: "Edit",
  titleDelete: "Delete",
  delete: "Delete",
  cancel: "Cancel",
  save: "Save",
  preview: "Preview",
  confirmDeleteBody: "Are you sure you want to delete this note? This action cannot be undone.",
  confirmDeleteTitle: "Confirm Delete",
  titlePlaceholder: "Title",
    bodyPlaceholder: "Write your note here...",
  moreText: "...",
    untitled: "Untitled",
  notesCount: (n: number) => n === 1 ? "1 note" : `${n} notes`,
} as const;
