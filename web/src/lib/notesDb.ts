export type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

// Small helper to open an IndexedDB database
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("retrotool", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) {
        const store = db.createObjectStore("notes", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", mode);
    const store = transaction.objectStore("notes");

    let request: IDBRequest<T> | undefined;
    try {
      const r = fn(store);
      if (r) request = r as IDBRequest<T>;
    } catch (e) {
      reject(e);
      return;
    }

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function listNotes(): Promise<Note[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readonly");
    const store = transaction.objectStore("notes");
    const req = store.getAll();

    req.onsuccess = () => {
      const items = (req.result as Note[]) ?? [];
      // newest first
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addNote(title: string, text: string): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    text,
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  await tx(db, "readwrite", (store) => store.put(note));
  return note;
}

export async function updateNote(id: string, title: string, text: string): Promise<void> {
  const db = await openDb();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");
    const store = transaction.objectStore("notes");
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as Note | undefined;
      if (!existing) return resolve();

      const updated: Note = {
        ...existing,
        title,
        text,
        updatedAt: now,
      };

      store.put(updated);
    };

    getReq.onerror = () => reject(getReq.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}


export async function deleteNote(id: string): Promise<void> {
  const db = await openDb();
  await tx(db, "readwrite", (store) => store.delete(id));
}
