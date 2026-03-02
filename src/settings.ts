// Settings tab for vault-sync plugin

import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultSyncPlugin from './main';
import { SyncSettings } from './types';

export class VaultSyncSettingTab extends PluginSettingTab {
  private plugin: VaultSyncPlugin;

  constructor(app: App, plugin: VaultSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Vault Sync Settings' });

    // Last host IP
    new Setting(containerEl)
      .setName('Last host IP')
      .setDesc('IP address of the last desktop host (auto-filled after first connect).')
      .addText(text =>
        text
          .setPlaceholder('192.168.1.x')
          .setValue(this.plugin.settings.lastHostIp)
          .onChange(async (value) => {
            this.plugin.settings.lastHostIp = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    // Port
    new Setting(containerEl)
      .setName('Port')
      .setDesc('HTTP port the host server listens on (default: 53217).')
      .addText(text =>
        text
          .setPlaceholder('53217')
          .setValue(String(this.plugin.settings.port))
          .onChange(async (value) => {
            const port = parseInt(value.trim(), 10);
            if (!isNaN(port) && port > 0 && port < 65536) {
              this.plugin.settings.port = port;
              await this.plugin.saveSettings();
            }
          }),
      );

    // Selected paths
    new Setting(containerEl)
      .setName('Selected paths')
      .setDesc(
        'Files or folders to include in sync, one per line. ' +
        'Leave empty to sync the entire vault.',
      )
      .addTextArea(area => {
        area
          .setPlaceholder('Notes/\nProjects/work.md')
          .setValue(this.plugin.settings.selectedPaths.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.selectedPaths = value
              .split('\n')
              .map(s => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          });
        area.inputEl.rows = 6;
        area.inputEl.style.width = '100%';
      });

    containerEl.createEl('p', {
      text: 'Tip: Use "Host Sync Session" on your desktop, then "Connect to Sync" on mobile.',
      cls: 'setting-item-description',
    });
  }
}

/** Load settings with defaults applied. */
export function applyDefaults(saved: Partial<SyncSettings>): SyncSettings {
  return {
    lastHostIp: saved.lastHostIp ?? '',
    selectedPaths: saved.selectedPaths ?? [],
    port: saved.port ?? 53217,
  };
}
