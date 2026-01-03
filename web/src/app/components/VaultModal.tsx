// src/app/components/VaultModal.tsx
"use client";

import { useMemo, useState } from "react";
import { UI } from "../uiStrings";

/* ──────────────────────────────────────────────
   Passphrase entropy helpers (UI-only, heuristic)
────────────────────────────────────────────── */
function estimateEntropyBits(input: string) {
  const s = input ?? "";
  const len = s.length;

  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /\d/.test(s);
  const hasSpace = /\s/.test(s);
  const hasSymbol = /[^\da-zA-Z\s]/.test(s);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSpace) pool += 1;
  if (hasSymbol) pool += 33;

  if (pool <= 1 || len === 0) return 0;

  let bits = len * Math.log2(pool);

  const unique = new Set(s).size;
  const uniqueRatio = unique / Math.max(1, len);
  if (uniqueRatio < 0.55) bits *= 0.85;

  if (/\d{2,4}$/.test(s)) bits *= 0.9;

  return Math.max(0, Math.round(bits));
}
type Tone = "bad" | "ok" | "good" | "great";

function strengthFromEntropy(bits: number): { label: string; tone: Tone; pct: number } {
  if (bits < 28) return { label: "Weak", tone: "bad", pct: 20 } as const;
  if (bits < 40) return { label: "Okay", tone: "ok", pct: 45 } as const;
  if (bits < 60) return { label: "Strong", tone: "good", pct: 75 } as const;
  return { label: "Very strong", tone: "great", pct: 100 } as const;
}

function toneClasses(tone: Tone) {
  switch (tone) {
    case "bad":
      return { bar: "bg-red-500/80", text: "text-red-200", ring: "focus:ring-red-500/20" } as const;
    case "ok":
      return { bar: "bg-amber-400/80", text: "text-amber-200", ring: "focus:ring-amber-500/20" } as const;
    case "good":
      return { bar: "bg-emerald-400/80", text: "text-emerald-200", ring: "focus:ring-emerald-500/20" } as const;
    default:
      return { bar: "bg-indigo-400/90", text: "text-indigo-200", ring: "focus:ring-indigo-500/20" } as const;
  }
}

/* ────────────────────────────────────────────── */

export function VaultModal({
  mode, // "setup" | "unlock"
  onSetup,
  onUnlockPassphrase,
  onUnlockRecovery,
  onRecoveryDone,
}: {
  mode: "setup" | "unlock";
  onSetup: (passphrase: string) => Promise<{ recoveryKey: string }>;
  onUnlockPassphrase: (passphrase: string) => Promise<void>;
  onUnlockRecovery: (recoveryKey: string) => Promise<void>;
  onRecoveryDone?: () => void;
}) {
  // setup state
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");

  // unlock state
  const [passphrase, setPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [shownRecoveryKey, setShownRecoveryKey] = useState<string | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const title = useMemo(() => {
    return mode === "setup"
      ? UI.createVaultPrompt
      : UI.unlockVaultPrompt;
  }, [mode]);

  /* ───── setup helpers ───── */
  const entropyBits = estimateEntropyBits(newPassphrase);
  const strength = strengthFromEntropy(entropyBits);
  const tone = toneClasses(strength.tone);

  const isTooShort =
    newPassphrase.trim().length > 0 &&
    newPassphrase.trim().length < 12;

  const isMismatch =
    confirmPassphrase.length > 0 &&
    newPassphrase !== confirmPassphrase;

  const canCreate =
    newPassphrase.trim().length >= 12 &&
    confirmPassphrase.length > 0 &&
    newPassphrase === confirmPassphrase;

  async function submit() {
    setErr(null);

    try {
      if (mode === "setup") {
        const p1 = newPassphrase.trim();
        const p2 = confirmPassphrase.trim();

        if (p1.length < 12) {
          setErr("Passphrase must be at least 12 characters long.");
          return;
        }
        if (p1 !== p2) {
          setErr("Passphrases do not match.");
          return;
        }

        const { recoveryKey } = await onSetup(p1);
        setShownRecoveryKey(recoveryKey);
        return;
      }

      if (useRecovery) {
        if (!recoveryKey.trim()) {
          setErr(UI.enterRecoveryKeyPrompt);
          return;
        }
        await onUnlockRecovery(recoveryKey.trim());
      } else {
        if (!passphrase.trim()) {
          setErr(UI.enterPassphrasePrompt);
          return;
        }
        await onUnlockPassphrase(passphrase);
      }
    } catch {
      setErr(UI.unlockFailedAlert);
    }
  }

  /* ───── Recovery key screen (unchanged logic) ───── */
  if (mode === "setup" && shownRecoveryKey) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
        <form
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D12] p-5 shadow-2xl"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="text-sm font-semibold">{UI.saveRecoveryKeyPrompt}</h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            {UI.recoveryKeyExplanation}
          </p>

          <div className="relative mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 font-mono text-xs text-zinc-100 break-all">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shownRecoveryKey);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                } catch {
                  alert(UI.copyFailedAlert);
                }
              }}
              className="absolute right-2 top-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/[0.06]"
            >
              {copied ? UI.copied : UI.copy}
            </button>
            {shownRecoveryKey}
          </div>

          <label className="mt-3 flex items-start gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={confirmedSaved}
              onChange={(e) => setConfirmedSaved(e.target.checked)}
              className="mt-0.5"
            />
            {UI.savedRecoveryKeyConfirm}
          </label>

          <button
            type="button"
            disabled={!confirmedSaved}
            onClick={() => {
              setShownRecoveryKey(null);
              onRecoveryDone?.();
            }}
            className={
              confirmedSaved
                ? "mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                : "mt-4 w-full rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-400 cursor-not-allowed"
            }
          >
            {UI.continue}
          </button>
        </form>
      </div>
    );
  }

  /* ───── Main modal ───── */
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <form
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D12] p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          {mode === "setup"
            ? "Choose a passphrase. Notes will be encrypted and locked on refresh."
            : "Enter your passphrase to decrypt notes (this session only)."}
        </p>

        {mode === "setup" ? (
          <>
            <label className="mt-3 block text-[11px] text-zinc-400">
              Passphrase
            </label>
            <input
              autoFocus
              type="password"
              value={newPassphrase}
              onChange={(e) => setNewPassphrase(e.target.value)}
              placeholder="Use a long passphrase (12+ characters)"
              className={`mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 ${tone.ring}`}
            />

            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-300">
                  Strength: <span className={tone.text}>{strength.label}</span>
                </div>
                <div className="text-xs text-zinc-400 tabular-nums">
                  ~{entropyBits} bits
                </div>
              </div>

              <div className="mt-2 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full ${tone.bar}`}
                  style={{ width: `${strength.pct}%` }}
                />
              </div>

              <div className="mt-2 text-[11px] text-zinc-400">
                Length matters more than symbols. Multiple words work great.
              </div>
            </div>

            {isTooShort && (
              <div className="mt-2 text-xs text-red-200">
                Minimum is 12 characters.
              </div>
            )}

            <label className="mt-3 block text-[11px] text-zinc-400">
              Confirm passphrase
            </label>
            <input
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Re-enter passphrase"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
            />

            {isMismatch && (
              <div className="mt-2 text-xs text-red-200">
                Passphrases do not match.
              </div>
            )}

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[11px] text-zinc-400">Tips</div>
              <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                <li>• Use 3–5 words you can remember.</li>
                <li>• Spaces are allowed and helpful.</li>
                <li>
                  • Avoid patterns like{" "}
                  <span className="text-zinc-200">Password123</span> or{" "}
                  <span className="text-zinc-200">Summer2026!</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setUseRecovery(false)}
                className={
                  !useRecovery
                    ? "rounded-xl bg-white/[0.08] px-3 py-2 text-xs text-zinc-100"
                    : "rounded-xl px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100"
                }
              >
                {UI.passphrase}
              </button>
              <button
                type="button"
                onClick={() => setUseRecovery(true)}
                className={
                  useRecovery
                    ? "rounded-xl bg-white/[0.08] px-3 py-2 text-xs text-zinc-100"
                    : "rounded-xl px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100"
                }
              >
                {UI.recoveryKey}
              </button>
            </div>

            {!useRecovery ? (
              <input
                autoFocus
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
              />
            ) : (
              <input
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Recovery key"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/20"
              />
            )}
          </>
        )}

        {err && <div className="mt-2 text-xs text-red-300">{err}</div>}

        <button
          type="submit"
          disabled={mode === "setup" ? !canCreate : false}
          className={
            mode === "setup" && !canCreate
              ? "mt-4 w-full rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-zinc-400 cursor-not-allowed"
              : "mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          }
        >
          {mode === "setup" ? "Create vault" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
