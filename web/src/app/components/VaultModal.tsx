// src/app/components/VaultModal.tsx
"use client";

import { useMemo, useState } from "react";
import { UI } from "../uiStrings";

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
  const [passphrase, setPassphrase] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [shownRecoveryKey, setShownRecoveryKey] = useState<string | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const title = useMemo(() => {
    if (mode === "setup") return UI.createVaultPrompt;
    return UI.unlockVaultPrompt;
  }, [mode]);

  async function submit() {
    setErr(null);

    try {
      if (mode === "setup") {
        if (passphrase.trim().length < 8) {
          setErr(UI.passphraseMinimumHint);
          return;
        }
        const { recoveryKey } = await onSetup(passphrase);
        setShownRecoveryKey(recoveryKey);
        return;
      }

      // unlock
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

  // After setup: show recovery key ONCE
  if (mode === "setup" && shownRecoveryKey) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
        <form
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D12] p-5 shadow-2xl"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
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
                    // Fallback: select text prompt
                    setCopied(false);
                    alert(UI.copyFailedAlert);
                }
                }}
                className="absolute right-2 top-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/[0.06]"
                aria-label={UI.ariaCopyRecoveryKey}
                title={UI.copy}
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
            aria-label={UI.passphrase}
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={mode === "setup" ? "New passphrase" : "Passphrase"}
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

        {err && <div className="mt-2 text-xs text-red-300">{err}</div>}

        <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
            {mode === "setup" ? "Create vault" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
