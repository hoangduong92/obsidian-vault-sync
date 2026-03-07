// Main plugin entry point for vault-sync

import { Notice, Platform, Plugin, requestUrl } from 'obsidian';
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

    // Mobile: "Sync Now" command fetches pending intent from server and runs sync
    this.addCommand({
      id: 'sync-now',
      name: 'Sync Now (from Safari)',
      callback: () => this.syncNow(),
    });

    // Protocol handler (works on desktop)
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

  // ── Sync Now (mobile command) ─────────────────────────────

  private async syncNow(): Promise<void> {
    let ip = this.settings.lastHostIp;
    const port = this.settings.port;

    if (!ip) {
      // Prompt user for IP (shown in Safari web UI)
      const prompted = await this.promptForIp();
      if (!prompted) return;
      ip = prompted;
      this.settings.lastHostIp = ip;
      await this.saveSettings();
    }

    new Notice(`[VaultSync] Connecting to ${ip}:${port}...`);
    try {
      const resp = await requestUrl({
        url: `http://${ip}:${port}/sync-intent`,
        method: 'GET',
        throw: false,
      });
      if (resp.status !== 200) {
        new Notice(`[VaultSync] Server not responding (${resp.status}). Is sync hosted on PC?`, 8000);
        return;
      }
      const intent = resp.json as { action: string; token: string };
      if (!intent.action || !intent.token) {
        new Notice('[VaultSync] No pending sync. Tap Pull/Push in Safari first.', 8000);
        return;
      }
      new Notice(`[VaultSync] Starting ${intent.action}...`);
      await runProtocolSync(this.app, this.settings, intent.action, ip, port, intent.token);
    } catch (err) {
      new Notice(`[VaultSync] Connection failed: ${err}`, 10000);
    }
  }

  private promptForIp(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '192.168.x.x';
      input.style.cssText = 'width:100%;padding:8px;font-size:16px;border-radius:4px;border:1px solid #666;background:#333;color:#fff;';

      const container = document.createElement('div');
      container.style.cssText = 'padding:12px;';
      container.innerHTML = '<p style="margin-bottom:8px;font-size:14px;">Enter PC server IP (shown in Safari):</p>';
      container.appendChild(input);

      const btn = document.createElement('button');
      btn.textContent = 'Connect';
      btn.style.cssText = 'width:100%;padding:10px;margin-top:8px;font-size:16px;border:none;border-radius:4px;background:#89b4fa;color:#1e1e2e;cursor:pointer;';
      container.appendChild(btn);

      const fragment = new DocumentFragment();
      fragment.appendChild(container);
      const notice = new Notice(fragment, 0);

      btn.onclick = () => {
        const val = input.value.trim();
        notice.hide();
        resolve(val || null);
      };
    });
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
