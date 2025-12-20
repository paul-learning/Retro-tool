"use client";

import { useEffect, useState } from "react";

type Note = { id: string; text: string };

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const res = await fetch("/api/notes");
    setNotes(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function addNote() {
    const t = text.trim();
    if (!t) return;

    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });

    setText("");
    load();
  }

  async function removeNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Retro Notes</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note…"
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 10,
          }}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
        />
        <button onClick={addNote} style={{ padding: "10px 14px", borderRadius: 10 }}>
          Add
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        {notes.map((n) => (
          <div
            key={n.id}
            style={{
              padding: 12,
              borderRadius: 14,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              background: "#fff8a6",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => removeNote(n.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
