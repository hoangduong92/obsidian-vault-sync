// Protocol sync handler — headless sync triggered by obsidian://vault-sync URI
// Handles both pull (PC→iPhone) and push (iPhone→PC) flows

import { App, Notice } from 'obsidian';
import { SyncSettings, SyncStatus } from './types';
import { scanVault, readVaultFile, writeVaultFile } from './vault-scanner';
import { getManifest, downloadFile, uploadFile, postSyncStatus, complete } from './client';
import { computeDiff } from './sync-engine';

async function reportStatus(
  ip: string, port: number, token: string, status: Partial<SyncStatus>, current: SyncStatus,
): Promise<SyncStatus> {
  const updated: SyncStatus = { ...current, ...status };
  if (status.done !== undefined && updated.total > 0) {
    updated.progress = Math.round((updated.done / updated.total) * 100);
  }
  await postSyncStatus(ip, port, token, updated).catch(() => {});
  return updated;
}

/** Pull files from PC (host) to iPhone (this device). */
async function runPull(
  app: App, settings: SyncSettings, ip: string, port: number, token: string,
): Promise<void> {
  new Notice('[VaultSync] Starting pull...');
  let status: SyncStatus = {
    phase: 'scanning', progress: 0, current: '', total: 0, done: 0, errors: [],
  };
  status = await reportStatus(ip, port, token, status, status);

  const remoteFiles = await getManifest(ip, port, token);
  const localFiles = await scanVault(app, settings);
  const diff = computeDiff(localFiles, remoteFiles);
  const toDownload = diff.filter(d => d.action === 'download');

  if (toDownload.length === 0) {
    status = await reportStatus(ip, port, token, {
      phase: 'complete', progress: 100, done: 0, total: 0,
    }, status);
    new Notice('[VaultSync] Already up to date!');
    return;
  }

  status = await reportStatus(ip, port, token, {
    phase: 'downloading', total: toDownload.length, done: 0,
  }, status);

  for (const entry of toDownload) {
    status = await reportStatus(ip, port, token, {
      current: entry.path, phase: 'downloading',
    }, status);
    try {
      const content = await downloadFile(ip, port, token, entry.path);
      await writeVaultFile(app, entry.path, content);
      status = await reportStatus(ip, port, token, { done: status.done + 1 }, status);
    } catch (err) {
      status.errors.push(`${entry.path}: ${err}`);
      status = await reportStatus(ip, port, token, {
        done: status.done + 1, errors: status.errors,
      }, status);
    }
  }

  status = await reportStatus(ip, port, token, {
    phase: 'complete', progress: 100, current: '',
  }, status);
  const errCount = status.errors.length;
  const msg = errCount > 0
    ? `[VaultSync] Done! ${status.done - errCount}/${status.total} files, ${errCount} errors`
    : `[VaultSync] Done! ${status.done} files synced`;
  new Notice(msg, 8000);
}

/** Push files from iPhone (this device) to PC (host). */
async function runPush(
  app: App, settings: SyncSettings, ip: string, port: number, token: string,
): Promise<void> {
  new Notice('[VaultSync] Starting push...');
  let status: SyncStatus = {
    phase: 'scanning', progress: 0, current: '', total: 0, done: 0, errors: [],
  };
  status = await reportStatus(ip, port, token, status, status);

  const remoteFiles = await getManifest(ip, port, token);
  const localFiles = await scanVault(app, settings);
  const diff = computeDiff(localFiles, remoteFiles);
  const toUpload = diff.filter(d => d.action === 'upload');

  if (toUpload.length === 0) {
    status = await reportStatus(ip, port, token, {
      phase: 'complete', progress: 100, done: 0, total: 0,
    }, status);
    new Notice('[VaultSync] Nothing to push — PC is up to date!');
    return;
  }

  status = await reportStatus(ip, port, token, {
    phase: 'uploading', total: toUpload.length, done: 0,
  }, status);

  for (const entry of toUpload) {
    status = await reportStatus(ip, port, token, {
      current: entry.path, phase: 'uploading',
    }, status);
    try {
      const content = await readVaultFile(app, entry.path);
      await uploadFile(ip, port, token, entry.path, content);
      status = await reportStatus(ip, port, token, { done: status.done + 1 }, status);
    } catch (err) {
      status.errors.push(`${entry.path}: ${err}`);
      status = await reportStatus(ip, port, token, {
        done: status.done + 1, errors: status.errors,
      }, status);
    }
  }

  status = await reportStatus(ip, port, token, {
    phase: 'complete', progress: 100, current: '',
  }, status);
  const errCount = status.errors.length;
  const msg = errCount > 0
    ? `[VaultSync] Done! ${status.done - errCount}/${status.total} uploaded, ${errCount} errors`
    : `[VaultSync] Done! ${status.done} files uploaded`;
  new Notice(msg, 8000);
}

/** Entry point called by obsidian://vault-sync URI handler. */
export async function runProtocolSync(
  app: App, settings: SyncSettings,
  action: string, ip: string, port: number, token: string,
): Promise<void> {
  try {
    if (action === 'pull') {
      await runPull(app, settings, ip, port, token);
    } else if (action === 'push') {
      await runPush(app, settings, ip, port, token);
    } else {
      new Notice(`[VaultSync] Unknown action: ${action}`, 8000);
    }
  } catch (err) {
    new Notice(`[VaultSync] Sync failed: ${err}`, 10000);
    await postSyncStatus(ip, port, token, {
      phase: 'error', progress: 0, current: '', total: 0, done: 0,
      errors: [String(err)],
    }).catch(() => {});
  }
}
