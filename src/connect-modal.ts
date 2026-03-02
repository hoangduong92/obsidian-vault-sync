// Modal for entering host IP + 4-digit code on client (mobile/desktop)

import { App, Modal, Notice, TextComponent } from 'obsidian';
import { SyncSettings } from './types';

export class ConnectModal extends Modal {
  private settings: SyncSettings;
  private onSubmit: (host: string, code: string) => void;
  private errorEl!: HTMLElement;

  constructor(
    app: App,
    settings: SyncSettings,
    onSubmit: (host: string, code: string) => void,
  ) {
    super(app);
    this.settings = settings;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('vault-sync-connect-modal');
    contentEl.createEl('h2', { text: 'Vault Sync — Connect' });

    let hostInput: TextComponent;
    let codeInput: TextComponent;

    // Host IP field
    const ipGroup = contentEl.createDiv({ cls: 'vault-sync-field-group' });
    ipGroup.createEl('label', { text: 'Host IP address', cls: 'vault-sync-label' });
    hostInput = new TextComponent(ipGroup)
      .setPlaceholder('192.168.1.x')
      .setValue(this.settings.lastHostIp);
    hostInput.inputEl.className += ' vault-sync-input';
    hostInput.inputEl.style.width = '100%';

    // Code field
    const codeGroup = contentEl.createDiv({ cls: 'vault-sync-field-group' });
    codeGroup.createEl('label', { text: '4-digit code (shown on host)', cls: 'vault-sync-label' });
    codeInput = new TextComponent(codeGroup).setPlaceholder('0000');
    codeInput.inputEl.className += ' vault-sync-input vault-sync-code-input';
    codeInput.inputEl.style.width = '100%';
    codeInput.inputEl.maxLength = 4;
    codeInput.inputEl.inputMode = 'numeric';

    // Auto-focus code field if IP is pre-filled
    if (this.settings.lastHostIp) {
      setTimeout(() => codeInput.inputEl.focus(), 50);
    } else {
      setTimeout(() => hostInput.inputEl.focus(), 50);
    }

    // Error message (hidden initially)
    this.errorEl = contentEl.createEl('p', { cls: 'vault-sync-error vault-sync-error--hidden' });

    // Buttons
    const btnRow = contentEl.createDiv({ cls: 'vault-sync-btn-row' });
    const connectBtn = btnRow.createEl('button', { text: 'Connect', cls: 'mod-cta' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });

    const handleConnect = () => {
      const host = hostInput.getValue().trim();
      const code = codeInput.getValue().trim();

      if (!this.validateIp(host)) {
        this.showError('Please enter a valid IP address (e.g. 192.168.1.x)');
        hostInput.inputEl.focus();
        return;
      }
      if (!/^\d{4}$/.test(code)) {
        this.showError('Code must be exactly 4 digits.');
        codeInput.inputEl.focus();
        return;
      }

      this.close();
      this.onSubmit(host, code);
    };

    connectBtn.addEventListener('click', handleConnect);

    // Allow Enter key to submit
    codeInput.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleConnect();
    });

    cancelBtn.addEventListener('click', () => this.close());
  }

  private validateIp(ip: string): boolean {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const n = parseInt(p, 10);
      return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
    });
  }

  private showError(msg: string): void {
    this.errorEl.textContent = msg;
    this.errorEl.removeClass('vault-sync-error--hidden');
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
