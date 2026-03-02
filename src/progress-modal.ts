// Progress modal — shows transfer progress during sync

import { App, Modal } from 'obsidian';

interface ProgressModalOptions {
  total: number;
  onCancel?: () => void;
}

export class ProgressModal extends Modal {
  private opts: ProgressModalOptions;
  private progressFillEl!: HTMLElement;
  private percentEl!: HTMLElement;
  private fileNameEl!: HTMLElement;
  private countEl!: HTMLElement;
  private cancelBtn!: HTMLButtonElement;
  private cancelled = false;

  constructor(app: App, opts: ProgressModalOptions) {
    super(app);
    this.opts = opts;
    // Prevent closing by clicking outside during transfer
    this.modalEl.addClass('vault-sync-progress-modal');
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Syncing...' });

    // Progress bar
    const barContainer = contentEl.createDiv({ cls: 'vault-sync-progress-bar' });
    this.progressFillEl = barContainer.createDiv({ cls: 'vault-sync-progress-fill' });

    // Percentage
    this.percentEl = contentEl.createEl('p', {
      text: '0%',
      cls: 'vault-sync-status',
    });

    // Current file
    this.fileNameEl = contentEl.createEl('p', { text: 'Preparing...', cls: 'vault-sync-current-file' });

    // Count
    this.countEl = contentEl.createEl('p', {
      text: `0 of ${this.opts.total} files`,
      cls: 'vault-sync-status',
    });

    // Cancel button
    const btnRow = contentEl.createDiv({ cls: 'vault-sync-btn-row' });
    this.cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
    this.cancelBtn.addEventListener('click', () => {
      this.cancelled = true;
      this.opts.onCancel?.();
      this.close();
    });
  }

  /** Returns true if the user pressed cancel. */
  get isCancelled(): boolean {
    return this.cancelled;
  }

  /** Update progress display. current is 1-based. */
  updateProgress(current: number, total: number, filename: string): void {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    this.progressFillEl.style.width = `${pct}%`;
    this.percentEl.textContent = `${pct}%`;
    this.fileNameEl.textContent = filename;
    this.countEl.textContent = `${current} of ${total} files`;
  }

  /** Call when all transfers finish — updates UI and auto-closes after 1 s. */
  complete(): void {
    this.progressFillEl.style.width = '100%';
    this.percentEl.textContent = '100%';
    this.fileNameEl.textContent = 'Done!';
    this.cancelBtn.disabled = true;

    setTimeout(() => this.close(), 1000);
  }

  /** Show an error message and allow user to close. */
  error(msg: string): void {
    this.fileNameEl.textContent = `Error: ${msg}`;
    this.fileNameEl.addClass('vault-sync-error');
    this.cancelBtn.textContent = 'Close';
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
