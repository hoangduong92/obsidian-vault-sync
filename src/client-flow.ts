// Client sync flow — connects to host, exchanges manifests, transfers files

import { App, Notice, Platform } from 'obsidian';
import { SyncSettings, FileManifestEntry, SyncDiffEntry } from './types';
import { scanVault, writeVaultFile } from './vault-scanner';
import { computeDiff, conflictFilename } from './sync-engine';
import { FilePickerModal } from './file-picker-modal';
import { DiffModal, ConflictResolution } from './diff-modal';
import { ProgressModal } from './progress-modal';
import * as client from './client';

/**
 * Run the client connect flow:
 * 1. Authenticate with host
 * 2. File picker → select paths
 * 3. Scan vault → compute diff
 * 4. Diff modal → user reviews
 * 5. Progress modal → transfer files
 */
export async function runClientSync(
  app: App,
  settings: SyncSettings,
  host: string,
  port: number,
  code: string,
  onSettingsChanged: () => Promise<void>,
): Promise<void> {
  const deviceName = Platform.isMobileApp ? 'iOS' : 'Desktop';
  new Notice('Connecting…');

  let token: string;
  let remoteManifest: FileManifestEntry[];

  try {
    const authResult = await client.authenticate(host, port, code, deviceName);
    token = authResult.token;
    remoteManifest = authResult.manifest;
  } catch (err) {
    new Notice(`Connection failed: ${err}`);
    return;
  }

  // File picker
  new FilePickerModal(app, {
    initialPaths: settings.selectedPaths,
    onConfirm: async (selectedPaths) => {
      settings.selectedPaths = selectedPaths;
      await onSettingsChanged();

      new Notice('Scanning local vault…');
      try {
        const localManifest = await scanVault(app, settings);
        const diff = computeDiff(localManifest, remoteManifest);
        showDiffAndSync(app, host, port, token, diff);
      } catch (err) {
        new Notice(`Scan failed: ${err}`);
      }
    },
    onCancel: async () => {
      await client.complete(host, port, token).catch(() => undefined);
    },
  }).open();
}

function showDiffAndSync(
  app: App,
  host: string,
  port: number,
  token: string,
  diff: SyncDiffEntry[],
): void {
  new DiffModal(app, {
    diff,
    onConfirm: async (resolutions) => {
      if (diff.length === 0) {
        await client.complete(host, port, token).catch(() => undefined);
        return;
      }
      await executeSync(app, host, port, token, diff, resolutions);
    },
    onCancel: async () => {
      await client.complete(host, port, token).catch(() => undefined);
    },
  }).open();
}

async function executeSync(
  app: App,
  host: string,
  port: number,
  token: string,
  diff: SyncDiffEntry[],
  resolutions: Map<string, ConflictResolution>,
): Promise<void> {
  const actionable = diff.filter(
    (e) => e.action !== 'delete_local' && e.action !== 'delete_remote',
  );
  const progress = new ProgressModal(app, {
    total: actionable.length,
    onCancel: async () => {
      await client.complete(host, port, token).catch(() => undefined);
    },
  });
  progress.open();

  let uploaded = 0,
    downloaded = 0,
    conflicts = 0;
  let current = 0;

  try {
    for (const entry of actionable) {
      if (progress.isCancelled) break;
      current++;
      progress.updateProgress(current, actionable.length, entry.path);

      if (entry.action === 'upload') {
        const fileObj = app.vault.getAbstractFileByPath(entry.path);
        if (!fileObj) continue;
        const content = await app.vault.readBinary(
          fileObj as import('obsidian').TFile,
        );
        await client.uploadFile(host, port, token, entry.path, content);
        uploaded++;
      } else if (entry.action === 'download') {
        const content = await client.downloadFile(host, port, token, entry.path);
        await writeVaultFile(app, entry.path, content);
        downloaded++;
      } else if (entry.action === 'conflict') {
        const resolution = resolutions.get(entry.path) ?? 'keep_both';
        await resolveConflict(app, host, port, token, entry.path, resolution);
        conflicts++;
      }
    }

    await client.complete(host, port, token);
    progress.complete();
    new Notice(
      `Sync complete! ↑ ${uploaded}  ↓ ${downloaded}  ⚠ ${conflicts} conflict(s)`,
    );
  } catch (err) {
    progress.error(String(err));
    new Notice(`Sync failed: ${err}`);
  }
}

async function resolveConflict(
  app: App,
  host: string,
  port: number,
  token: string,
  filePath: string,
  resolution: ConflictResolution,
): Promise<void> {
  if (resolution === 'keep_local') {
    const fileObj = app.vault.getAbstractFileByPath(filePath);
    if (fileObj) {
      const content = await app.vault.readBinary(
        fileObj as import('obsidian').TFile,
      );
      await client.uploadFile(host, port, token, filePath, content);
    }
  } else if (resolution === 'keep_remote') {
    const content = await client.downloadFile(host, port, token, filePath);
    await writeVaultFile(app, filePath, content);
  } else {
    // keep_both: save remote as conflict copy, keep local unchanged
    const remoteContent = await client.downloadFile(host, port, token, filePath);
    await writeVaultFile(app, conflictFilename(filePath), remoteContent);
  }
}
