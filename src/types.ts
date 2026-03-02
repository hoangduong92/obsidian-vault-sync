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
}

export const DEFAULT_SETTINGS: SyncSettings = {
  lastHostIp: '',
  selectedPaths: [],
  port: 53217,
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
}
