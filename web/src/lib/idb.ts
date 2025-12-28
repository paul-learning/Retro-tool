// src/lib/idb.ts
export type DbName = "notes-e2ee";

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function openAppDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("notes-e2ee", 2); // <-- bump version to wipe/migrate

    req.onupgradeneeded = () => {
      const db = req.result;

      // wipe old stores safely
      for (const name of Array.from(db.objectStoreNames)) {
        db.deleteObjectStore(name);
      }

      db.createObjectStore("vault", { keyPath: "id" });
      db.createObjectStore("notes", { keyPath: "id" });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export async function idbGet<T>(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return reqToPromise(store.get(key)) as Promise<T | undefined>;
}

export async function idbPut<T>(
  db: IDBDatabase,
  storeName: string,
  value: T,
): Promise<void> {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  store.put(value as any);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

export async function idbDelete(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<void> {
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

export async function idbGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  // getAll is widely supported in modern browsers
  return reqToPromise(store.getAll()) as Promise<T[]>;
}
