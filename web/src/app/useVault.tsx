// src/app/useVault.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getVaultRecord, putVaultRecord, type VaultRecordV1 } from "@/lib/vaultDb";
import {
  b64ToBytes,
  bytesToB64,
  decryptJson,
  deriveAesGcmKeyFromPassphrase,
  encryptJson,
  generateAesGcmKey,
  generateRecoveryKey,
  importRawAesGcmKey,
  exportRawKey,
} from "@/lib/crypto";

type VaultStatus = "checking" | "needs-setup" | "locked" | "unlocked";
const HAS_VAULT_LS_KEY = "vault:hasVault";


export function useVault() {
  const [status, setStatus] = useState<VaultStatus>("checking");
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [hasVault, setHasVault] = useState(false);

useEffect(() => {
  let cancelled = false;

  // Fast path: decide initial UI immediately based on localStorage marker.
  const hasMarker = localStorage.getItem(HAS_VAULT_LS_KEY) === "1";
  setHasVault(hasMarker);
  setStatus(hasMarker ? "locked" : "needs-setup");

  // Source of truth: verify via IndexedDB and correct marker if needed.
  (async () => {
    const rec = await getVaultRecord();
    if (cancelled) return;

    if (!rec) {
      localStorage.removeItem(HAS_VAULT_LS_KEY);
      setHasVault(false);
      setStatus("needs-setup");
    } else {
      localStorage.setItem(HAS_VAULT_LS_KEY, "1");
      setHasVault(true);
      setStatus("locked");
    }
  })().catch(() => {
    if (cancelled) return;
    // If DB fails, keep the fast-path UI (don't flip to needs-setup).
    // Optional: you could introduce an error status later.
  });

  return () => {
    cancelled = true;
  };
}, []);


  const setupVault = useCallback(async (passphrase: string): Promise<{ recoveryKey: string }> => {
    // 1) create random vault key
    const vk = await generateAesGcmKey();
    const rawVk = await exportRawKey(vk);

    // 2) wrap vault key with passphrase-derived KEK
    const passSalt = crypto.getRandomValues(new Uint8Array(16));
    const passIters = 250_000;
    const passKek = await deriveAesGcmKeyFromPassphrase({ passphrase, salt: passSalt, iterations: passIters });

    const wrappedByPass = await encryptJson(passKek, { rawVkB64: bytesToB64(rawVk) });

    // 3) create recovery key, derive KEK from it, wrap vault key again
    const recoveryKey = generateRecoveryKey();
    const recSalt = crypto.getRandomValues(new Uint8Array(16));
    const recIters = 250_000;
    const recKek = await deriveAesGcmKeyFromPassphrase({ passphrase: recoveryKey, salt: recSalt, iterations: recIters });

    const wrappedByRec = await encryptJson(recKek, { rawVkB64: bytesToB64(rawVk) });

    const rec: VaultRecordV1 = {
      id: "default",
      version: 1,

      passSaltB64: bytesToB64(passSalt),
      passIters,
      wrappedVaultByPassIvB64: wrappedByPass.ivB64,
      wrappedVaultByPassCtB64: wrappedByPass.ctB64,

      recSaltB64: bytesToB64(recSalt),
      recIters,
      wrappedVaultByRecIvB64: wrappedByRec.ivB64,
      wrappedVaultByRecCtB64: wrappedByRec.ctB64,
    };

    await putVaultRecord(rec);
    localStorage.setItem(HAS_VAULT_LS_KEY, "1");


    // unlock immediately (this session)
    setVaultKey(vk);
    setHasVault(true);
    setStatus("unlocked");

    return { recoveryKey };
  }, []);

  const unlockWithPassphrase = useCallback(async (passphrase: string) => {
    const rec = await getVaultRecord();
    if (!rec) {
      localStorage.removeItem(HAS_VAULT_LS_KEY);
      setHasVault(false);
      setStatus("needs-setup");
      return;
    }

    const salt = b64ToBytes(rec.passSaltB64);
    const kek = await deriveAesGcmKeyFromPassphrase({
      passphrase,
      salt,
      iterations: rec.passIters,
    });

    // decrypt wrapped vault payload -> raw vault key
    const obj = await decryptJson<{ rawVkB64: string }>(kek, rec.wrappedVaultByPassIvB64, rec.wrappedVaultByPassCtB64);
    const raw = b64ToBytes(obj.rawVkB64);

    const vk = await importRawAesGcmKey(raw);
    setVaultKey(vk);
    localStorage.setItem(HAS_VAULT_LS_KEY, "1");
    setHasVault(true);
    setStatus("unlocked");
  }, []);

  const unlockWithRecoveryKey = useCallback(async (recoveryKey: string) => {
    const rec = await getVaultRecord();
    if (!rec) {
      localStorage.removeItem(HAS_VAULT_LS_KEY);
      setHasVault(false);
      setStatus("needs-setup");
      return;
    }

    const salt = b64ToBytes(rec.recSaltB64);
    const kek = await deriveAesGcmKeyFromPassphrase({
      passphrase: recoveryKey,
      salt,
      iterations: rec.recIters,
    });

    const obj = await decryptJson<{ rawVkB64: string }>(kek, rec.wrappedVaultByRecIvB64, rec.wrappedVaultByRecCtB64);
    const raw = b64ToBytes(obj.rawVkB64);

    const vk = await importRawAesGcmKey(raw);
    setVaultKey(vk);
    localStorage.setItem(HAS_VAULT_LS_KEY, "1");
    setHasVault(true);
    setStatus("unlocked");
  }, []);

  const lock = useCallback(() => {
    setVaultKey(null);
    setStatus(hasVault ? "locked" : "needs-setup");
  }, [hasVault]);

  return useMemo(
    () => ({
      status,
      vaultKey,
      hasVault,
      setupVault,
      unlockWithPassphrase,
      unlockWithRecoveryKey,
      lock,
    }),
    [status, vaultKey, hasVault, setupVault, unlockWithPassphrase, unlockWithRecoveryKey, lock],
  );
}
