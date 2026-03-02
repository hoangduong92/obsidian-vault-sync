// Main plugin entry point for vault-sync

import { Notice, Platform, Plugin } from 'obsidian';
import { SyncSettings } from './types';
import { VaultSyncSettingTab, applyDefaults } from './settings';
import { ConnectModal } from './connect-modal';
import { launchHostFlow, HostFlowHandle } from './host-flow';
import { runClientSync } from './client-flow';

export default class VaultSyncPlugin extends Plugin {
  settings!: SyncSettings;
  private hostHandle: HostFlowHandle = { stopServer: null };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new VaultSyncSettingTab(this.app, this));

    this.addCommand({
      id: 'host-sync-session',
      name: 'Host Sync Session',
      callback: () => this.hostSyncSession(),
    });

    this.addCommand({
      id: 'connect-to-sync',
      name: 'Connect to Sync',
      callback: () => this.connectToSync(),
    });
  }

  onunload(): void {
    this.hostHandle.stopServer?.();
    this.hostHandle.stopServer = null;
  }

  async loadSettings(): Promise<void> {
    this.settings = applyDefaults((await this.loadData()) ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ── Host flow ──────────────────────────────────────────────

  private hostSyncSession(): void {
    if (!Platform.isDesktop) {
      new Notice('Host mode is only available on desktop.');
      return;
    }
    if (this.hostHandle.stopServer) {
      new Notice('Sync server is already running. Stop it first.');
      return;
    }

    launchHostFlow(
      this.app,
      this.settings,
      this.hostHandle,
      () => this.saveSettings(),
    );
  }

  // ── Client flow ────────────────────────────────────────────

  private connectToSync(): void {
    try {
      new Notice(`Vault Sync: command fired, settings=${JSON.stringify(this.settings)}`);
      const modal = new ConnectModal(this.app, this.settings, async (host, code) => {
        this.settings.lastHostIp = host;
        await this.saveSettings();
        await runClientSync(
          this.app,
          this.settings,
          host,
          this.settings.port,
          code,
          () => this.saveSettings(),
        );
      });
      new Notice('Vault Sync: opening modal...');
      modal.open();
      new Notice('Vault Sync: modal.open() called');
    } catch (err) {
      new Notice(`Vault Sync ERROR: ${err}`);
    }
  }
}
