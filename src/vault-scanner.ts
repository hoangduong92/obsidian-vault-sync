// Vault scanner — builds a FileManifestEntry[] using Obsidian Vault API

import { App, TFile } from 'obsidian';
import { FileManifestEntry, SyncSettings } from './types';
import { sha256Hex } from './crypto';

/**
 * Return true if `filePath` is under any of the selected paths.
 * If selectedPaths is empty, all files are included.
 */
function isIncluded(filePath: string, selectedPaths: string[]): boolean {
  if (selectedPaths.length === 0) return true;
  return selectedPaths.some(prefix =>
    filePath === prefix || filePath.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'),
  );
}

/**
 * Scan vault files and produce a manifest.
 * Reads file content to compute SHA-256 hash.
 */
export async function scanVault(
  app: App,
  settings: SyncSettings,
): Promise<FileManifestEntry[]> {
  const files: TFile[] = app.vault.getFiles();
  const entries: FileManifestEntry[] = [];

  for (const file of files) {
    if (!isIncluded(file.path, settings.selectedPaths)) continue;

    try {
      const stat = file.stat;
      const content = await app.vault.readBinary(file);
      const hash = await sha256Hex(content);

      entries.push({
        path: file.path,
        mtime: stat.mtime,
        size: stat.size,
        hash,
      });
    } catch (err) {
      console.warn(`[VaultSync] skipping ${file.path}:`, err);
    }
  }

  return entries;
}

/**
 * Read a single vault file as ArrayBuffer.
 */
export async function readVaultFile(app: App, path: string): Promise<ArrayBuffer> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof (await import('obsidian')).TFile)) {
    throw new Error(`File not found: ${path}`);
  }
  return app.vault.readBinary(file as TFile);
}

/**
 * Write binary content to a vault path, creating folders as needed.
 */
export async function writeVaultFile(
  app: App,
  path: string,
  content: ArrayBuffer,
): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(path);

  // Ensure parent folder exists
  const parts = path.split('/');
  if (parts.length > 1) {
    const folder = parts.slice(0, -1).join('/');
    if (!app.vault.getAbstractFileByPath(folder)) {
      await app.vault.createFolder(folder);
    }
  }

  if (existing) {
    await app.vault.modifyBinary(existing as TFile, content);
  } else {
    await app.vault.createBinary(path, content);
  }
}
