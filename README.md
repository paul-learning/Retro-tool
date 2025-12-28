# Notes (working title)

A local-first, privacy-focused notes app built with React / Next.js.

The core idea is simple:
**your notes are encrypted locally, unlocked only in your browser session, and never stored in plaintext.**

This project is currently in active development and intentionally starts small, clean, and secure.

---

## What the app can already do

### 🔐 Local vault & encryption
- Notes are **always encrypted** before being stored in IndexedDB
- A **vault** is created on first use with a user-chosen passphrase
- Notes are **locked on refresh / tab close**
- Vault key exists **only in memory** for the active session
- A **recovery key** is generated once during setup and shown exactly once

### 📝 Notes
- Create, edit, and delete notes
- Each note has:
  - title
  - body
  - created / last edited timestamp
- Clean modal-based editing experience
- Autosave-style workflow (explicit save, keyboard shortcuts)

### ✍️ Markdown support
- Write notes in Markdown
- Live preview while typing
- Basic formatting toolbar:
  - bold / italic
  - inline code
  - headings
  - lists
  - blockquotes
  - links
- Secure Markdown rendering:
  - no raw HTML
  - safe link handling
  - external links open in new tabs

### 🎨 UI / UX
- Minimal, dark UI
- Keyboard-friendly (Enter, Escape, shortcuts)
- Context menu for note actions
- Floating action button for quick note creation
- Responsive grid layout

---

## Security model (current)

- Encryption uses the Web Crypto API (AES-GCM)
- Notes are encrypted **before** touching IndexedDB
- No plaintext note content is stored locally
- Passphrase is never persisted
- Recovery key is never persisted
- Losing both passphrase and recovery key means losing access (by design)

This mirrors real end-to-end encrypted systems.

---

## What is planned / coming next

### 🔑 Accounts & multi-device sync
- Optional user accounts
- Sync encrypted notes across devices
- Vault key unlocked locally after login
- Same encryption model, different key distribution

### 🤝 Sharing (end-to-end encrypted)
- Share notes or notebooks with other users
- Per-note keys to enable selective sharing
- No server access to plaintext content

### 🗂 Shared notebooks / teams
- First-class shared spaces
- Designed for small teams
- Encrypted collaboration

### 🔐 Improved key management
- Being considered: Optional PIN unlock (with clear security tradeoffs)
- Being considered: Regenerate recovery key (with passphrase confirmation)
- Key rotation & migration support

### 📦 Quality of life
- Better markdown styling
- Search
- Tags / topics
- Export & import
- Offline-first sync strategies

---

## Development status

This is an **early but functional prototype**.
The focus so far has been on:
- correctness
- security
- clean architecture
- not blocking future E2EE features

Expect breaking changes while the foundation is solidified.

---

## Disclaimer

This project is provided as-is.
If you forget both your passphrase and recovery key, your notes cannot be recovered.

That is a feature — not a bug.
