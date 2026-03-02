// Host modal — shows IP + code, waits for client connection (Desktop only)

import { App, Modal } from 'obsidian';

interface HostModalOptions {
  ip: string;
  code: string;
  port: number;
  onCancel: () => void;
}

export class HostModal extends Modal {
  private opts: HostModalOptions;
  private statusEl!: HTMLElement;
  private cancelBtn!: HTMLButtonElement;

  constructor(app: App, opts: HostModalOptions) {
    super(app);
    this.opts = opts;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('vault-sync-host-modal');

    contentEl.createEl('h2', { text: 'Vault Sync — Host' });

    // IP display
    const ipRow = contentEl.createDiv({ cls: 'vault-sync-row' });
    ipRow.createEl('span', { text: 'Your IP:', cls: 'vault-sync-label' });
    ipRow.createEl('span', { text: this.opts.ip, cls: 'vault-sync-ip' });

    // Code display — large digits
    const codeRow = contentEl.createDiv({ cls: 'vault-sync-row' });
    codeRow.createEl('span', { text: 'Code:', cls: 'vault-sync-label' });
    const codeEl = codeRow.createEl('span', { cls: 'vault-sync-code' });
    // Space out digits for readability
    codeEl.textContent = this.opts.code.split('').join(' ');

    // Port display
    const portRow = contentEl.createDiv({ cls: 'vault-sync-row' });
    portRow.createEl('span', { text: 'Port:', cls: 'vault-sync-label' });
    portRow.createEl('span', { text: String(this.opts.port), cls: 'vault-sync-ip' });

    // Status
    this.statusEl = contentEl.createEl('p', {
      text: 'Waiting for connection...',
      cls: 'vault-sync-status vault-sync-status--waiting',
    });

    // Cancel button
    const btnRow = contentEl.createDiv({ cls: 'vault-sync-btn-row' });
    this.cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    this.cancelBtn.addEventListener('click', () => {
      this.opts.onCancel();
      this.close();
    });
  }

  /** Call when a client successfully authenticates. */
  setConnected(): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = 'Client connected!';
    this.statusEl.removeClass('vault-sync-status--waiting');
    this.statusEl.addClass('vault-sync-status--connected');
    this.cancelBtn.textContent = 'Close';
  }

  /** Call when sync is complete — auto-close. */
  complete(): void {
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
