// src/lib/vaultDb.ts
import { openAppDb, idbGet, idbPut } from "./idb";

export type VaultRecordV1 = {
  id: "default";
  version: 1;

  passSaltB64: string;
  passIters: number;
  wrappedVaultByPassIvB64: string;
  wrappedVaultByPassCtB64: string;

  recSaltB64: string;
  recIters: number;
  wrappedVaultByRecIvB64: string;
  wrappedVaultByRecCtB64: string;
};

export async function getVaultRecord(): Promise<VaultRecordV1 | undefined> {
  const db = await openAppDb();
  try {
    return await idbGet<VaultRecordV1>(db, "vault", "default");
  } finally {
    db.close();
  }
}

export async function putVaultRecord(rec: VaultRecordV1): Promise<void> {
  const db = await openAppDb();
  try {
    await idbPut(db, "vault", rec);
  } finally {
    db.close();
  }
}
