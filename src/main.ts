// Main plugin entry point for vault-sync

import { Notice, Platform, Plugin, TFile, TAbstractFile } from 'obsidian';
import { SyncSettings } from './types';
import { VaultSyncSettingTab, applyDefaults } from './settings';
import { ConnectModal } from './connect-modal';
import { launchHostFlow, HostFlowHandle } from './host-flow';
import { runClientSync } from './client-flow';
import { runProtocolSync } from './protocol-sync-handler';

const TRIGGER_FILE = '.vault-sync-trigger.md';

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

    // Protocol handler (works on desktop, may not work on iOS)
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

    // File-based trigger: Safari creates .vault-sync-trigger.md via obsidian://new
    // Plugin watches for it, reads params, deletes file, runs sync
    this.registerEvent(
      this.app.vault.on('create', (file: TAbstractFile) => {
        if (file.path === TRIGGER_FILE && file instanceof TFile) {
          this.handleTriggerFile(file);
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file.path === TRIGGER_FILE && file instanceof TFile) {
          this.handleTriggerFile(file);
        }
      }),
    );

    // Check on startup in case trigger file already exists
    this.app.workspace.onLayoutReady(() => this.checkExistingTrigger());
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

  // ── Trigger file handler (iOS workaround) ─────────────────

  private async handleTriggerFile(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      await this.app.vault.delete(file);
      // Format: action|token|ip|port
      const parts = content.trim().split('|');
      if (parts.length < 4) {
        new Notice('[VaultSync] Invalid trigger file format');
        return;
      }
      const [action, token, ip, port] = parts;
      await runProtocolSync(this.app, this.settings, action, ip, parseInt(port), token);
    } catch (err) {
      new Notice(`[VaultSync] Trigger error: ${err}`, 10000);
    }
  }

  private async checkExistingTrigger(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(TRIGGER_FILE);
    if (file instanceof TFile) {
      await this.handleTriggerFile(file);
    }
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
