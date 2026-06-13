# Encrypted Cloud Sync — Design

**Date:** 2026-06-13
**Status:** Design approved in brainstorming; not yet implemented
**Priorities (from the user, in order):** 1. Security 2. Long-term stability / fallback to localStorage

---

## 1. Purpose & Problem

Today the app is fully client-side: all state lives in `localStorage` via
`pinia-plugin-persistedstate`. That means data is trapped on one browser on one
device. We want an **optional** online sync layer so that:

- A single operator can use the tool across multiple devices, **and**
- Two operators can share one retreat's data (they almost never edit
  simultaneously).

Sync must be **purely additive**: if it's disabled, unreachable, or broken, the
app behaves exactly as it does today. localStorage remains the source of truth.

## 2. Success Criteria

- Data round-trips between two devices through the server, encrypted end-to-end.
- The server (and any backup of it) only ever holds **ciphertext** — a leak of
  the database or its backups reveals nothing without the password.
- With sync off or the network down, the app is **functionally identical** to
  today (no errors, no blocking, no data loss).
- The two operators effectively never lose each other's work; the rare overlap
  is surfaced, not silently clobbered.
- The server is something agents can stand up and keep running for years with
  near-zero maintenance.

## 3. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Use case | One operator multi-device **and** two operators sharing — but **almost never simultaneous** editing |
| 2 | Conflict model | **Last-write-wins + revision guard** ("seatbelt"). No CRDT, no real-time server. |
| 3 | Storage backend | **Self-hosted VPS** (on `exe.dev`) with **SQLite** (single file, easy to back up) |
| 4 | Backup of the SQLite file | **TBD** — litestream / cron `git push` / `rsync`. Untrusted target is fine (ciphertext only). |
| 5 | Sync trigger | **Auto-save feel**: debounced auto-push + auto-pull on load/focus. No save button in the happy path. |
| 6 | Encryption | **End-to-end** in the browser via WebCrypto. Server never sees password or plaintext. |
| 7 | Server access control | **Password gates everything** — one password derives both the encryption key and a server auth proof. No separate tokens, no user accounts. |
| 8 | Password across sessions | **Remember on device, opt-in** (checkbox to not remember). Local data is already plaintext on the device, so this is low marginal risk. |
| 9 | Shared secret | Both operators **share one password**. Accepted. |
| 10 | Lost password | **No cloud recovery** (true E2E). localStorage still has everything; re-key and re-push. Accepted. |
| 11 | Workspace identity | The **password *is* the workspace.** One password → one encrypted blob. A different password = a separate space, for free. |
| 12 | Server runtime | **Go, single static binary** (`modernc.org/sqlite`, pure Go, no CGO) behind **Caddy** (automatic HTTPS). Chosen for longevity / minimal upkeep since agents maintain it. |

## 4. Security Architecture

### 4.1 Threat model & honest scope
- **Protected:** the cloud copy, data in transit (TLS), and all server-side
  backups. A full compromise of the VPS or its backups yields only ciphertext
  plus a non-secret salt.
- **Not protected (and already true today):** data at rest in `localStorage` on
  an unlocked device. Anyone with the unlocked laptop already sees everything.
  The sync password's job is the cloud/transit/backup surface, not the local
  device.

### 4.2 Key derivation (all WebCrypto, zero new browser deps)
1. Random **16-byte salt** generated once per workspace, stored alongside the
   blob on the server (salt is non-secret).
2. `PBKDF2-HMAC-SHA256`, **600,000 iterations** (OWASP 2023 floor), over the
   password + salt → 64 bytes of key material.
3. Split the 64 bytes:
   - bytes `[0..32)` → **encKey** (AES-256-GCM). **Never leaves the browser.**
   - bytes `[32..64)` → **authProof** (256-bit). Sent to the server to prove
     "I know the password."
4. **Workspace id = `SHA-256(authProof)`** (hex). The server stores rows keyed
   by this id and stores only `SHA-256(authProof)` — never authProof itself.
   So the proof simultaneously **identifies** the workspace and **authorizes**
   read/write.

> Note: because salt + the stored proof-hash are server-side, a server/backup
> leak technically enables an *offline brute-force of the password*. This is the
> same exposure as the encrypted blob itself (also offline-attackable with the
> salt), so it adds no new weakness. Mitigation = a strong shared passphrase +
> the 600k-iteration KDF. (Argon2id is a future upgrade; see §9.)

### 4.3 Encryption of the blob
- Cipher: **AES-256-GCM**.
- Fresh random **96-bit IV per push**, prepended to the ciphertext.
- GCM auth tag covers integrity — tampering is detected on decrypt.

## 5. Sync Protocol (last-write-wins + revision guard)

Server row (one per workspace):

```
workspaces(
  id          TEXT PRIMARY KEY,   -- SHA-256(authProof), hex
  proof_hash  BLOB NOT NULL,      -- SHA-256(authProof) (same value, explicit)
  revision    INTEGER NOT NULL,   -- monotonic, server-incremented
  salt        BLOB NOT NULL,      -- 16 bytes, non-secret
  iv          BLOB NOT NULL,      -- 12 bytes
  ciphertext  BLOB NOT NULL,      -- AES-256-GCM output
  updated_at  TEXT NOT NULL,      -- ISO timestamp, plaintext (non-sensitive)
  created_at  TEXT NOT NULL
)
```

`lastWriter` (operator name) lives **inside** the encrypted blob, so the
conflict banner reads it only after a successful decrypt. `updated_at` and
`revision` are plaintext metadata (non-sensitive) used for the guard.

### Endpoints (HTTPS only, via Caddy)
- `POST /v1/pull` — `Authorization: Bearer <authProofHex>`
  → `200 {revision, salt, iv, ciphertext}` or `404` (workspace doesn't exist
  yet). Server verifies `SHA-256(proof) == stored hash`.
- `POST /v1/push` — `Authorization: Bearer <authProofHex>`,
  body `{baseRevision, salt, iv, ciphertext}`
  → `200 {revision}` if `baseRevision == current revision` (then increment &
  store); → `409 {currentRevision}` if stale (the **seatbelt**). First-ever push
  uses `baseRevision: 0`.

### Client flow
- **Pull** on app load, on window focus, and on a light poll (~20–30 s) while
  open. If the pulled revision is newer than what we last applied → reconcile.
- **Push** debounced ~3–5 s after the last local change (detected via a hash of
  the snapshot, so identical state doesn't churn the server).
- **409 on push** → show a non-blocking banner: *"Someone saved changes N min
  ago — Reload theirs / Keep mine (overwrite)."* This is the only place the user
  ever confronts the conflict, and it never auto-destroys work.

## 6. What gets synced

A single JSON **snapshot** (one blob, matching the last-write-wins model)
containing a manifest of all persisted state:

- Pinia persisted store keys: `guestStore`, `dormitoryStore`,
  `assignmentStore`, `settingsStore`, `timelineStore`.
- The standalone `dormAssignments-*` localStorage keys (view date, print mode,
  per-sub-tab column prefs, print date range, etc.).
- A top-level `schemaVersion` for forward-compatible migrations.

The exact key manifest is enumerated at implementation time from
`main.ts` / each store's `persist` config so nothing is silently dropped.

## 7. Fallback & Stability (priority #2)

- Every network call is wrapped so **any failure is non-fatal**: timeouts,
  offline, 5xx, TLS errors → app keeps using localStorage, status indicator
  shows "offline / not synced," retry with backoff.
- Sync is **opt-in** and **off by default**. Existing users are unaffected until
  they enter a server URL + password.
- A small **sync status indicator** (synced / syncing / offline / conflict) so
  the operator always knows the truth.
- Decrypt failure (wrong password, corrupt blob) is surfaced clearly and
  **never** overwrites good local data.

## 8. Client Integration (Vue/Pinia)

- New `src/features/sync/`:
  - `useSync.ts` composable — orchestrates pull/push/debounce/poll/conflict.
  - `crypto.ts` — WebCrypto KDF + AES-GCM helpers (pure, unit-testable).
  - `SyncStatusIndicator.vue` — header status chip.
  - `SyncConflictBanner.vue` — the 409 reconcile UI.
- New `syncStore` (Pinia) — config (server URL, remember-me, operator name) and
  runtime status. Config persists; the derived key is cached only if
  "remember on device" is on.
- Settings panel gains a **Cloud Sync** section: enable toggle, server URL,
  password field, "remember on this device" checkbox, operator name, and a
  manual "Sync now" / "Pull now" escape hatch.

## 9. Out of Scope (YAGNI)

- Real-time collaborative editing / CRDT / OT / live cursors.
- Per-user accounts, roles, or any login system beyond the shared password.
- Multi-tenant hosting (one monastery, workspaces are just passwords).
- Password recovery / reset (impossible by E2E design — accepted).
- Per-field or per-store partial sync (one snapshot blob is enough).

### Possible future upgrades (noted, not built)
- **Argon2id** KDF (via a small wasm lib) to harden against offline brute force.
- Server-side **revision history** (keep last N blobs) for "undo a bad push."
- Compression of the blob before encryption for large datasets.

## 10. Server Deployment (exe.dev)

- Go binary built with `modernc.org/sqlite` (pure Go → static, no CGO).
- `systemd` unit keeps it running; data dir holds `sync.db`.
- **Caddy** reverse proxy on a subdomain (e.g. `sync.<domain>`) for automatic
  HTTPS + cert renewal.
- Hardening: request body size cap (e.g. 5 MB), basic per-IP rate limit,
  constant-time proof comparison.
- Backup of `sync.db`: **TBD** (litestream / cron `git push` / `rsync`) — target
  need not be trusted since the blob is ciphertext.

## 11. Considered & Rejected: CRDTs (Yjs / Automerge / Gun.db)

We scanned CRDT-based real-time approaches and rejected them for this app.

**What a CRDT actually buys:** exactly one thing this design lacks — automatic
merging of *concurrent* edits with no conflict prompt (two people editing the
same retreat in the same minute, fusing field-by-field). Offline edits,
persistence, and multi-device sync we already get more simply. Since
simultaneous editing **almost never happens** here (decision #1), the one thing
CRDTs are for is the thing we don't need.

**Fights priority #1 (security):** CRDT sync protocols assume the server can read
and merge updates. Keeping true end-to-end encryption means encrypting every
update opaquely and merging only on clients — a known-hard, DIY area the Yjs
community has wrestled with for years. Our blob-level `PBKDF2 → AES-GCM` is
boring, standard, and auditable; the correct posture for guest PII.

**Fights priority #2 (stability):**
- *Unbounded growth* — CRDTs retain merge metadata, tombstones, and often full
  edit history forever (Yjs version-vector + delete-set per version; Automerge a
  DAG node per keystroke). Our snapshot stays the size of the data.
- *More moving parts* — WASM bundles, harder debugging, a CRDT-aware relay vs.
  two dumb endpoints over SQLite.
- *Store rewrite* — our state is normalized Pinia records, not a text document.
  CRDT merge would require re-modeling every field as a registered CRDT type.

**The specific libraries:**
- **Yjs** — best-in-class, but built for collaborative *text/rich-text editing*
  (shared cursors in a document). Wrong data shape for structured records.
- **Gun.db** — has E2E built in (SEA: ECDH + AES-GCM), but it's an opinionated
  P2P **graph database** with accumulated technical debt. Replaces "one SQLite
  file I can back up" with a network that's hard to reason about and keep boring
  for years. Directly opposed to priority #2.

**The one trigger to revisit:** if real usage shows *frequent* simultaneous
editing and the conflict banner becomes annoying. The response then would be
**Yjs + a relay (e.g. y-sweet)** accepting the E2E complexity, or a lighter
middle step — **per-record last-write-wins** (merge by record timestamp on pull)
instead of whole-blob, which removes most clobbering without any CRDT machinery.
**Not** Gun.db.

## 12. Open Implementation Questions (resolve at build time)

1. Exact subdomain/URL on `exe.dev` and Caddy config.
2. Final backup mechanism for `sync.db` (§10).
3. Precise localStorage key manifest (§6) — enumerate from current persist
   configs.
4. Debounce/poll timings — start at 3–5 s push / 20–30 s poll, tune later.
