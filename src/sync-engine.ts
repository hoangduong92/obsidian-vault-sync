// Sync engine — computes diff between local and remote manifests

import { FileManifestEntry, SyncDiffEntry } from './types';

/**
 * Compute a sync diff between local and remote manifests.
 *
 * Rules:
 *   - local only, was in baseline  → deleted on remote side → delete_local
 *   - local only, not in baseline  → new file → upload
 *   - remote only, was in baseline → deleted locally → delete_remote
 *   - remote only, not in baseline → new file → download
 *   - both exist, same hash → skip (no-op, not included)
 *   - both exist, both modified since lastSyncTime → conflict
 *   - both exist, local newer → upload
 *   - both exist, remote newer → download
 */
export function computeDiff(
  localManifest: FileManifestEntry[],
  remoteManifest: FileManifestEntry[],
  lastSyncTime?: number,
  baselineManifest?: FileManifestEntry[],
): SyncDiffEntry[] {
  const localMap = new Map(localManifest.map(e => [e.path, e]));
  const remoteMap = new Map(remoteManifest.map(e => [e.path, e]));
  const baselineSet = new Set((baselineManifest ?? []).map(e => e.path));
  const allPaths = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const diff: SyncDiffEntry[] = [];

  for (const path of allPaths) {
    const local = localMap.get(path);
    const remote = remoteMap.get(path);

    if (local && !remote) {
      // Was it in the baseline? If so, it was deleted on remote → delete locally
      if (baselineSet.has(path)) {
        diff.push({ path, action: 'delete_local', localEntry: local });
      } else {
        diff.push({ path, action: 'upload', localEntry: local });
      }
      continue;
    }

    if (!local && remote) {
      // Was it in the baseline? If so, it was deleted locally → delete on remote
      if (baselineSet.has(path)) {
        diff.push({ path, action: 'delete_remote', remoteEntry: remote });
      } else {
        diff.push({ path, action: 'download', remoteEntry: remote });
      }
      continue;
    }

    if (local && remote) {
      // Identical content — skip
      if (local.hash === remote.hash) continue;

      if (lastSyncTime !== undefined) {
        const localChanged = local.mtime > lastSyncTime;
        const remoteChanged = remote.mtime > lastSyncTime;

        if (localChanged && remoteChanged) {
          diff.push({ path, action: 'conflict', localEntry: local, remoteEntry: remote });
          continue;
        }
      }

      // Resolve by mtime — newer wins
      if (local.mtime >= remote.mtime) {
        diff.push({ path, action: 'upload', localEntry: local, remoteEntry: remote });
      } else {
        diff.push({ path, action: 'download', localEntry: local, remoteEntry: remote });
      }
    }
  }

  return diff;
}

/**
 * Resolve a conflict by saving local content as a conflict copy.
 * Returns the conflict filename that was created.
 */
export function conflictFilename(originalPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dot = originalPath.lastIndexOf('.');
  if (dot === -1) return `${originalPath}.sync-conflict-${timestamp}`;
  return `${originalPath.slice(0, dot)}.sync-conflict-${timestamp}${originalPath.slice(dot)}`;
}
