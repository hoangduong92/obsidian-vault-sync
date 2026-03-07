// Main plugin entry point for vault-sync

import { Notice, Platform, Plugin } from 'obsidian';
import { SyncSettings } from './types';
import { VaultSyncSettingTab, applyDefaults } from './settings';
import { ConnectModal } from './connect-modal';
import { launchHostFlow, HostFlowHandle } from './host-flow';
import { runClientSync } from './client-flow';
import { runProtocolSync } from './protocol-sync-handler';

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

    // obsidian://vaultsync?action=pull&token=x&ip=x&port=53217
    this.registerObsidianProtocolHandler('vaultsync', async (params) => {
      const { action, token, ip, port } = params;
      if (!action || !token || !ip) {
        new Notice('[VaultSync] Invalid URI — missing action, token, or ip');
        return;
      }
      await runProtocolSync(
        this.app, this.settings, action, ip, parseInt(port || '53217'), token,
      );
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
    if (Platform.isMobile) {
      const ip = this.settings.lastHostIp || '<PC-IP>';
      new Notice(`On mobile, use Safari: http://${ip}:${this.settings.port}`, 10000);
      return;
    }
    new Notice('[VaultSync] Opening connect dialog...');
    try {
      new ConnectModal(this.app, this.settings, async (host, code) => {
        try {
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
        } catch (err) {
          new Notice(`Vault Sync error: ${err}`, 10000);
        }
      }).open();
    } catch (err) {
      new Notice(`Vault Sync modal error: ${err}`, 10000);
    }
  }
}
