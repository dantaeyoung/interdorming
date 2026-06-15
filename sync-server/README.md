# dormsync — encrypted cloud sync server

A tiny, self-hosted sync server for the Blue Cliff Monastery Dorm Assignment
Tool. It stores **one encrypted blob per workspace** and nothing else: the
browser does all encryption (PBKDF2 → AES-256-GCM), so the server only ever
holds ciphertext plus a non-secret salt, a revision number, and timestamps.

- **Single static binary**, no CGO (`modernc.org/sqlite`, pure Go).
- **SQLite** file on disk — back it up like any other file.
- **Last-write-wins with a revision guard** (the "seatbelt"): a stale push is
  rejected with `409` rather than silently clobbering newer data.
- **The password is the workspace.** The server can't read the data and can't
  recover it if the password is lost.

## Build

```bash
cd sync-server
go build -o dormsync .
```

Produces a single `./dormsync` binary. Cross-compile for the server's arch if
building elsewhere, e.g. for a typical Linux VPS:

```bash
GOOS=linux GOARCH=amd64 go build -o dormsync .
```

## Run

```bash
PORT=8787 DB_PATH=/var/lib/dormsync/sync.db ./dormsync
```

| Env var   | Default      | Meaning                                  |
| --------- | ------------ | ---------------------------------------- |
| `PORT`    | `8787`       | TCP port to listen on (HTTP).            |
| `DB_PATH` | `./sync.db`  | SQLite database file (created if absent).|

The process logs one startup line, e.g.
`dormsync listening on :8787 (db=/var/lib/dormsync/sync.db)`.

## API

Two endpoints, both `POST`, both authenticated by a bearer **auth proof**
(`Authorization: Bearer <authProofHex>`). The server derives the workspace id
as `SHA-256(authProof)` and stores rows keyed by that hash — a database or
backup leak therefore yields only hashes, never write access.

- `POST /v1/pull` → `200 {revision, salt, iv, ciphertext}` or `404` (no
  workspace yet). `401` if the bearer token is missing or not valid hex.
- `POST /v1/push` — body `{baseRevision, salt, iv, ciphertext}` →
  `200 {revision}` when `baseRevision` matches the current revision (then it
  increments and stores); `409 {currentRevision}` if stale; `401` as above;
  `413` if the body exceeds the **5 MB** cap.

CORS is open (`Access-Control-Allow-Origin: *`) because auth is a bearer proof,
not a cookie — the proof, not the origin, is what authorizes. This lets the app
(served from `app.<domain>`) call the API at `sync.<domain>`.

> **TLS is mandatory in production.** The auth proof travels in the
> `Authorization` header, so the server must only ever be reached over HTTPS.
> Terminate TLS with Caddy (see `Caddyfile.example`) — never expose the plain
> HTTP port publicly.

## Deploy (systemd + Caddy)

1. Copy the binary and create a data dir + service user:
   ```bash
   sudo install -d -o dormsync -g dormsync /var/lib/dormsync
   sudo install -m 0755 dormsync /usr/local/bin/dormsync
   ```
2. Install the unit and start it:
   ```bash
   sudo cp dormsync.service /etc/systemd/system/dormsync.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now dormsync
   ```
3. Put Caddy in front for automatic HTTPS (see `Caddyfile.example`), then point
   the app's "Server URL" at `https://sync.<domain>`.

## Backups

The whole state is one SQLite file (`DB_PATH`). Two good options:

- **Simple (cron + sqlite3 `.backup`)** — a consistent snapshot nightly, kept
  for N days. The blobs are already encrypted, so backups are safe to store
  off-box:
  ```bash
  # /etc/cron.daily/dormsync-backup
  sqlite3 /var/lib/dormsync/sync.db ".backup '/var/backups/dormsync-$(date +\%F).db'"
  find /var/backups -name 'dormsync-*.db' -mtime +14 -delete
  ```
- **Continuous ([litestream](https://litestream.io))** — streams every change
  to S3/Backblaze for point-in-time recovery. Recommended if losing a day of
  edits is unacceptable.

## Operational notes

- **Body cap:** 5 MB per push (`maxBodyBytes` in `handlers.go`). A full
  workspace snapshot is far smaller; raise it only if needed.
- **Client timings** (in `src/features/sync/useSync.ts`): auto-push is debounced
  ~4 s after the last local change; auto-pull runs on load, on window focus, and
  on a ~25 s poll. Tune there, not here.
- **No silent clobber:** the revision guard plus the in-app conflict banner are
  the entire safety story — do not add an auto-overwrite path on `409`.
```
