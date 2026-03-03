// Core data types for vault sync plugin

export interface FileManifestEntry {
  path: string;
  mtime: number; // unix timestamp ms
  size: number;  // bytes
  hash: string;  // sha256 hex
}

export interface SyncDiffEntry {
  path: string;
  action: 'upload' | 'download' | 'conflict' | 'delete_local' | 'delete_remote';
  localEntry?: FileManifestEntry;
  remoteEntry?: FileManifestEntry;
}

export interface SyncSettings {
  lastHostIp: string;
  selectedPaths: string[]; // files/folders to sync (empty = all)
  port: number;            // default 53217
  lastSyncTime: number;    // unix timestamp ms of last successful sync (0 = never)
  lastManifest: FileManifestEntry[]; // snapshot of files after last sync (for deletion detection)
}

export const DEFAULT_SETTINGS: SyncSettings = {
  lastHostIp: '',
  selectedPaths: [],
  port: 53217,
  lastSyncTime: 0,
  lastManifest: [],
};

// Auth request/response
export interface AuthRequest {
  code: string;
  deviceName: string;
}

export interface AuthResponse {
  token: string;
  manifest: FileManifestEntry[];
}

// Manifest diff request
export interface ManifestDiffRequest {
  files: FileManifestEntry[];
}

export interface ManifestDiffResponse {
  diff: SyncDiffEntry[];
}

// Internal server state
export interface ServerSession {
  code: string;
  token: string | null;
  manifest: FileManifestEntry[];
  active: boolean;
  failedAuthAttempts: number;
  lastFailedAuthTime: number;
}

// Shared utility
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
