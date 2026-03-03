# Vault Sync — Priority Fix Plan

After auditing every source file, here are the issues ranked by severity.

---

## P0 — Critical (Security / Data Correctness)

### 1. Encryption exists but is never used
- `crypto.ts` has `deriveKey()`, `encrypt()`, `decrypt()` — none are called anywhere
- All file content and manifests travel as **plaintext HTTP** on the local network
- **Fix:** Encrypt file payloads with AES-256-GCM derived from the 4-digit code before transfer, decrypt on receive. Apply to both `/file` GET/POST and the manifest exchange.

### 2. Server ignores `settings.port`
- `server.ts` line 14: `const PORT = 53217` hardcoded
- `startServer()` receives `settings` but calls `server.listen(PORT, ...)` — the user's configured port is ignored
- **Fix:** Use `settings.port` instead of the hardcoded constant. Delete the `const PORT` line.

### 3. No brute-force protection on auth code
- 4-digit code = only 10,000 possible values
- No rate limiting, no lockout, no delay after failed attempts
- Any device on the LAN can brute-force access in seconds
- **Fix:** Add a failed-attempt counter with exponential backoff delay (e.g., 1s after 3 failures, then double). Optionally increase code length to 6 digits.

---

## P1 — High (Broken/Missing Functionality)

### 4. Host modal never updates on client connect or sync complete
- `HostModal` has `setConnected()` and `complete()` methods but nobody calls them
- The host user stares at "Waiting for connection..." forever, even after sync finishes
- **Fix:** Pass the `HostModal` reference into the server request handler. Call `setConnected()` on successful `/auth`, call `complete()` on `/complete`.

### 5. No `lastSyncTime` — conflict detection is broken
- `computeDiff()` accepts `lastSyncTime` but it's always called without it (undefined)
- This means the `if (lastSyncTime !== undefined)` block never runs — "conflicts" are never detected, it just falls back to mtime-wins
- mtime comparison across devices with clock skew is unreliable
- **Fix:** Store `lastSyncTime` in settings. Save it after each successful sync. Pass it to `computeDiff()`.

### 6. No file deletion sync
- `SyncDiffEntry.action` includes `'delete_local' | 'delete_remote'` but `computeDiff()` never produces them
- `client-flow.ts` explicitly filters them out: `diff.filter(e => e.action !== 'delete_local' && e.action !== 'delete_remote')`
- If you delete a file on one device, the other side will re-upload it on next sync
- **Fix:** Store a "last known manifest" after each sync. On next sync, compare against it to detect deletions (file was in last manifest but not in current scan = deleted). Execute deletes during sync.

### 7. `writeVaultFile` only creates one level of parent folders
- `parts.slice(0, -1).join('/')` only attempts to create the immediate parent
- If path is `a/b/c/file.md` and `a/` doesn't exist, `createFolder('a/b/c')` fails
- **Fix:** Recursively ensure all ancestor folders exist.

---

## P2 — Medium (Code Quality / Polish)

### 8. `readVaultFile` uses unnecessary dynamic `import('obsidian')`
- `vault-scanner.ts` line 56: `file instanceof (await import('obsidian')).TFile`
- `TFile` is already imported at the top of the file
- **Fix:** Just use the already-imported `TFile`.

### 9. File picker "select all" semantics mismatch
- When `selectedPaths` is empty, `vault-scanner.ts` `isIncluded()` returns true for all files (empty = sync all)
- But `file-picker-modal.ts` converts empty selection to individual file paths on first open
- This means after first use, `selectedPaths` is a huge list of individual files instead of `[]`
- New files added to vault won't be included in sync until manually selected
- **Fix:** Add an "All files" mode. When user clicks "Select All", store `[]` (meaning all). Only store individual paths when user deselects specific items.

### 10. `/complete` endpoint doesn't actually stop the server
- Sets `session.active = false` but the HTTP server keeps running, port stays bound
- Server only truly stops on the 10-minute timeout or when user clicks Cancel
- **Fix:** Call the server stop function from inside the `/complete` handler, or trigger it via a callback.

### 11. Duplicate `formatSize()` function
- Identical implementations in both `file-picker-modal.ts` and `diff-modal.ts`
- **Fix:** Move to a shared utility or `types.ts`.

---

## Recommended Implementation Order

| Step | Items | Rationale |
|------|-------|-----------|
| 1 | #2 (port fix) | Trivial one-liner, unblocks testing |
| 2 | #8 (readVaultFile) | Trivial cleanup |
| 3 | #4 (host modal updates) | Small wiring change, big UX improvement |
| 4 | #7 (nested folders) | Small fix, prevents silent data loss |
| 5 | #10 (server stop on complete) | Small fix, cleanup |
| 6 | #11 (dedup formatSize) | Trivial cleanup |
| 7 | #3 (brute-force protection) | Security, moderate complexity |
| 8 | #1 (encryption) | Security, highest complexity — touches client + server |
| 9 | #5 (lastSyncTime) | Requires settings migration, moderate complexity |
| 10 | #9 (file picker semantics) | UX change, needs careful handling |
| 11 | #6 (deletion sync) | Most complex — needs stored manifest, new UI for confirming deletes |
