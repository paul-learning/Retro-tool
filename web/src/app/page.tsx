"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  text: string;
};

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  async function loadNotes() {
    const res = await fetch("/api/notes");
    setNotes(await res.json());
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function addNote() {
    const value = text.trim();
    if (!value) return;

    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });

    setText("");
    loadNotes();
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    loadNotes();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#8a8282ff",
        color: "#ffffffff",
        fontFamily: "system-ui",
      }}
    >
      {/* Header */}
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Notes</h1>
      </div>

      {/* Notes area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
            paddingBottom: 24,
          }}
        >
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                background: "#056facff",
                padding: 12,
                borderRadius: 14,
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{note.text}</div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => deleteNote(note.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input bar (bottom) */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid #ddd",
          background: "#f7f7f7",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note…"
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addNote();
          }}
        />
        <button
          onClick={addNote}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Add
        </button>
      </div>
    </main>
  );
}
