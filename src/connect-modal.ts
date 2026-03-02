// Modal for entering host IP + 4-digit code on client (mobile/desktop)
// Uses raw HTML elements instead of TextComponent for iOS compatibility

import { App, Modal, Notice } from 'obsidian';
import { SyncSettings } from './types';

export class ConnectModal extends Modal {
  private settings: SyncSettings;
  private onSubmit: (host: string, code: string) => void;

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
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Vault Sync — Connect' });

    // Host IP
    contentEl.createEl('label', { text: 'Host IP address' });
    const hostInput = contentEl.createEl('input', { type: 'text' });
    hostInput.placeholder = '192.168.1.x';
    hostInput.value = this.settings.lastHostIp || '';
    hostInput.style.width = '100%';
    hostInput.style.marginBottom = '12px';
    hostInput.style.padding = '8px';
    hostInput.style.fontSize = '16px';

    // Code
    contentEl.createEl('label', { text: '4-digit code' });
    const codeInput = contentEl.createEl('input', { type: 'text' });
    codeInput.placeholder = '0000';
    codeInput.maxLength = 4;
    codeInput.inputMode = 'numeric';
    codeInput.style.width = '100%';
    codeInput.style.marginBottom = '12px';
    codeInput.style.padding = '8px';
    codeInput.style.fontSize = '24px';
    codeInput.style.textAlign = 'center';
    codeInput.style.letterSpacing = '8px';

    // Error text
    const errorEl = contentEl.createEl('p');
    errorEl.style.color = 'red';
    errorEl.style.display = 'none';

    // Buttons
    const btnRow = contentEl.createDiv();
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '12px';

    const connectBtn = btnRow.createEl('button', { text: 'Connect' });
    connectBtn.classList.add('mod-cta');
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });

    const handleConnect = () => {
      const host = hostInput.value.trim();
      const code = codeInput.value.trim();

      if (!host || host.split('.').length !== 4) {
        errorEl.textContent = 'Enter a valid IP (e.g. 192.168.1.105)';
        errorEl.style.display = 'block';
        return;
      }
      if (!/^\d{4}$/.test(code)) {
        errorEl.textContent = 'Code must be 4 digits';
        errorEl.style.display = 'block';
        return;
      }

      this.close();
      this.onSubmit(host, code);
    };

    connectBtn.addEventListener('click', handleConnect);
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConnect();
    });
    cancelBtn.addEventListener('click', () => this.close());

    // Focus
    setTimeout(() => {
      if (this.settings.lastHostIp) codeInput.focus();
      else hostInput.focus();
    }, 100);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
