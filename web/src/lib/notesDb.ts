// src/lib/notesDb.ts
import { openAppDb, idbDelete, idbGetAll, idbPut } from "./idb";
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  b64ToBytes,
  bytesToB64,
  decryptJson,
  encryptJson,
  exportRawKey,
  generateAesGcmKey,
  importRawAesGcmKey,
} from "./crypto";

export type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

// What is stored in IndexedDB (no plaintext title/text)
type EncryptedNoteRecordV1 = {
  id: string;
  createdAt: number;
  updatedAt: number;
  cryptoVersion: 1;

  // encrypted payload: { title, text }
  payloadIvB64: string;
  payloadCtB64: string;

  // per-note key wrapped by vault key
  wrappedNoteKeyIvB64: string;
  wrappedNoteKeyCtB64: string;
};

type NotePayload = { title: string; text: string };

function newId(): string {
  // good enough locally; later you can switch to UUIDv7
  return crypto.randomUUID();
}

async function wrapNoteKey(vaultKey: CryptoKey, noteKey: CryptoKey): Promise<{ ivB64: string; ctB64: string }> {
  const rawNoteKey = await exportRawKey(noteKey);
  const { iv, ct } = await aesGcmEncrypt(vaultKey, rawNoteKey);
  return { ivB64: bytesToB64(iv), ctB64: bytesToB64(ct) };
}

async function unwrapNoteKey(vaultKey: CryptoKey, wrappedIvB64: string, wrappedCtB64: string): Promise<CryptoKey> {
  const iv = b64ToBytes(wrappedIvB64);
  const ct = b64ToBytes(wrappedCtB64);
  const raw = await aesGcmDecrypt(vaultKey, iv, ct);
  return importRawAesGcmKey(raw);
}

export async function listNotes(vaultKey: CryptoKey): Promise<Note[]> {
  const db = await openAppDb();
  try {
    const rows = await idbGetAll<EncryptedNoteRecordV1>(db, "notes");

    const out: Note[] = [];
    for (const r of rows) {
      const noteKey = await unwrapNoteKey(vaultKey, r.wrappedNoteKeyIvB64, r.wrappedNoteKeyCtB64);
      const payload = await decryptJson<NotePayload>(noteKey, r.payloadIvB64, r.payloadCtB64);

      out.push({
        id: r.id,
        title: payload.title ?? "",
        text: payload.text ?? "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      });
    }

    // newest first feels nice
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out;
  } finally {
    db.close();
  }
}

export async function addNote(vaultKey: CryptoKey, title: string, text: string): Promise<void> {
  const db = await openAppDb();
  try {
    const noteKey = await generateAesGcmKey();

    const wrapped = await wrapNoteKey(vaultKey, noteKey);
    const payload = await encryptJson(noteKey, { title, text });

    const now = Date.now();
    const rec: EncryptedNoteRecordV1 = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      cryptoVersion: 1,
      payloadIvB64: payload.ivB64,
      payloadCtB64: payload.ctB64,
      wrappedNoteKeyIvB64: wrapped.ivB64,
      wrappedNoteKeyCtB64: wrapped.ctB64,
    };

    await idbPut(db, "notes", rec);
  } finally {
    db.close();
  }
}

export async function updateNote(vaultKey: CryptoKey, id: string, title: string, text: string): Promise<void> {
  const db = await openAppDb();
  try {
    const rows = await idbGetAll<EncryptedNoteRecordV1>(db, "notes");
    const existing = rows.find((x) => x.id === id);
    if (!existing) return;

    const noteKey = await unwrapNoteKey(vaultKey, existing.wrappedNoteKeyIvB64, existing.wrappedNoteKeyCtB64);
    const payload = await encryptJson(noteKey, { title, text });

    const updated: EncryptedNoteRecordV1 = {
      ...existing,
      updatedAt: Date.now(),
      payloadIvB64: payload.ivB64,
      payloadCtB64: payload.ctB64,
    };

    await idbPut(db, "notes", updated);
  } finally {
    db.close();
  }
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openAppDb();
  try {
    await idbDelete(db, "notes", id);
  } finally {
    db.close();
  }
}
