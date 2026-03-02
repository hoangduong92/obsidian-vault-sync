// Host sync flow — runs on desktop only, starts server and waits for client

import { App, Notice } from 'obsidian';
import { SyncSettings } from './types';
import { startServer } from './server';
import { HostModal } from './host-modal';
import { FilePickerModal } from './file-picker-modal';

/** Result handle for the host flow */
export interface HostFlowHandle {
  stopServer: (() => void) | null;
}

/**
 * Launch the host sync flow:
 * 1. File picker → save selected paths
 * 2. Start HTTP server → show HostModal (IP + code)
 * 3. Auto-timeout after 10 min
 */
export function launchHostFlow(
  app: App,
  settings: SyncSettings,
  handle: HostFlowHandle,
  onSettingsChanged: () => Promise<void>,
): void {
  new FilePickerModal(app, {
    initialPaths: settings.selectedPaths,
    onConfirm: async (selectedPaths) => {
      settings.selectedPaths = selectedPaths;
      await onSettingsChanged();
      await startHostServer(app, settings, handle);
    },
  }).open();
}

async function startHostServer(
  app: App,
  settings: SyncSettings,
  handle: HostFlowHandle,
): Promise<void> {
  let hostModal: HostModal | null = null;

  try {
    handle.stopServer = await startServer(app, settings, (code, ip) => {
      hostModal = new HostModal(app, {
        ip,
        code,
        port: settings.port,
        onCancel: () => {
          handle.stopServer?.();
          handle.stopServer = null;
        },
      });
      hostModal.open();
    });

    // Auto-stop after 10 minutes
    setTimeout(() => {
      if (handle.stopServer) {
        handle.stopServer();
        handle.stopServer = null;
        hostModal?.close();
        new Notice('Vault Sync server timed out and was stopped.');
      }
    }, 10 * 60 * 1000);
  } catch (err) {
    new Notice(`Failed to start server: ${err}`);
  }
}
