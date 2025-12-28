// src/lib/crypto.ts
const te = new TextEncoder();
const td = new TextDecoder();

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Ensure we pass a real ArrayBuffer (not ArrayBufferLike) to WebCrypto
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}


export function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// base64url-ish for nicer recovery keys
export function bytesToB64Url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export function b64UrlToBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return b64ToBytes(b64);
}

export function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return b;
}

async function importPbkdf2KeyFromString(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(te.encode(secret)),
    "PBKDF2",
    false,
    ["deriveKey"],
    );

}

export async function deriveAesGcmKeyFromPassphrase(opts: {
  passphrase: string;
  salt: Uint8Array;
  iterations: number;
}): Promise<CryptoKey> {
  const baseKey = await importPbkdf2KeyFromString(opts.passphrase);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(opts.salt),
      iterations: opts.iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function generateAesGcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function importRawAesGcmKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(raw),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}


export async function aesGcmEncrypt(key: CryptoKey, plaintext: Uint8Array): Promise<{ iv: Uint8Array; ct: Uint8Array }> {
  const iv = randomBytes(12);
    const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
    );

  return { iv, ct: new Uint8Array(ctBuf) };
}

export async function aesGcmDecrypt(key: CryptoKey, iv: Uint8Array, ct: Uint8Array): Promise<Uint8Array> {
  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ct),
    );

  return new Uint8Array(ptBuf);
}

export async function encryptJson(key: CryptoKey, obj: unknown): Promise<{ ivB64: string; ctB64: string }> {
  const bytes = te.encode(JSON.stringify(obj));
  const { iv, ct } = await aesGcmEncrypt(key, bytes);
  return { ivB64: bytesToB64(iv), ctB64: bytesToB64(ct) };
}

export async function decryptJson<T>(key: CryptoKey, ivB64: string, ctB64: string): Promise<T> {
  const iv = b64ToBytes(ivB64);
  const ct = b64ToBytes(ctB64);
  const pt = await aesGcmDecrypt(key, iv, ct);
  return JSON.parse(td.decode(pt)) as T;
}

// Recovery key: show once, user stores it.
// This is NOT stored in DB; only used to derive a KEK to unwrap the vault key.
export function generateRecoveryKey(): string {
  // 24 random bytes -> short-ish base64url
  return bytesToB64Url(randomBytes(24));
}
