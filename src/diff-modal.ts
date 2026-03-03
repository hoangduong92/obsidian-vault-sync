// Diff modal — review sync changes before confirming

import { App, Modal } from 'obsidian';
import { SyncDiffEntry, formatSize } from './types';

export type ConflictResolution = 'keep_local' | 'keep_remote' | 'keep_both';

export interface DiffModalResult {
  confirmed: boolean;
  conflictResolutions: Map<string, ConflictResolution>;
}

interface DiffModalOptions {
  diff: SyncDiffEntry[];
  onConfirm: (resolutions: Map<string, ConflictResolution>) => void;
  onCancel?: () => void;
}

export class DiffModal extends Modal {
  private opts: DiffModalOptions;
  private resolutions: Map<string, ConflictResolution> = new Map();

  constructor(app: App, opts: DiffModalOptions) {
    super(app);
    this.opts = opts;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('vault-sync-diff-modal');
    contentEl.createEl('h2', { text: 'Sync Preview' });

    const { diff } = this.opts;

    if (diff.length === 0) {
      contentEl.createEl('p', { text: 'No changes needed — vault is already in sync.' });
    } else {
      const uploads = diff.filter(e => e.action === 'upload');
      const downloads = diff.filter(e => e.action === 'download');
      const deleteLocal = diff.filter(e => e.action === 'delete_local');
      const deleteRemote = diff.filter(e => e.action === 'delete_remote');
      const conflicts = diff.filter(e => e.action === 'conflict');

      if (uploads.length > 0) this.renderSection(contentEl, `Upload to host (${uploads.length} file(s))`, '↑', uploads);
      if (downloads.length > 0) this.renderSection(contentEl, `Download from host (${downloads.length} file(s))`, '↓', downloads);
      if (deleteLocal.length > 0) this.renderSection(contentEl, `Delete locally (${deleteLocal.length} file(s))`, '🗑', deleteLocal);
      if (deleteRemote.length > 0) this.renderSection(contentEl, `Delete on host (${deleteRemote.length} file(s))`, '🗑', deleteRemote);
      if (conflicts.length > 0) this.renderConflicts(contentEl, conflicts);
    }

    // Action buttons
    const btnRow = contentEl.createDiv({ cls: 'vault-sync-btn-row' });
    const syncBtn = btnRow.createEl('button', {
      text: diff.length === 0 ? 'Close' : 'Sync Now',
      cls: 'mod-cta',
    });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });

    syncBtn.addEventListener('click', () => {
      this.opts.onConfirm(this.resolutions);
      this.close();
    });

    cancelBtn.addEventListener('click', () => {
      this.opts.onCancel?.();
      this.close();
    });
  }

  private renderSection(
    container: HTMLElement,
    title: string,
    icon: string,
    entries: SyncDiffEntry[],
  ): void {
    const section = container.createDiv({ cls: 'vault-sync-diff-section' });
    section.createEl('h3', { text: `${icon} ${title}` });

    for (const entry of entries) {
      const row = section.createDiv({ cls: 'vault-sync-diff-row' });
      row.createEl('span', { text: entry.path, cls: 'vault-sync-diff-path' });
      const size = entry.localEntry?.size ?? entry.remoteEntry?.size ?? 0;
      row.createEl('span', { text: formatSize(size), cls: 'vault-sync-diff-size' });
    }
  }

  private renderConflicts(container: HTMLElement, entries: SyncDiffEntry[]): void {
    const section = container.createDiv({ cls: 'vault-sync-diff-section vault-sync-diff-section--conflict' });
    section.createEl('h3', { text: `Conflicts (${entries.length} file(s))` });

    for (const entry of entries) {
      const row = section.createDiv({ cls: 'vault-sync-conflict-row' });
      row.createEl('span', { text: entry.path, cls: 'vault-sync-diff-path' });

      const opts: { value: ConflictResolution; label: string }[] = [
        { value: 'keep_local', label: 'Keep local' },
        { value: 'keep_remote', label: 'Keep remote' },
        { value: 'keep_both', label: 'Keep both' },
      ];

      // Default: keep_both
      this.resolutions.set(entry.path, 'keep_both');

      const radioGroup = row.createDiv({ cls: 'vault-sync-radio-group' });
      const name = `conflict-${entry.path.replace(/[^a-z0-9]/gi, '_')}`;

      for (const opt of opts) {
        const label = radioGroup.createEl('label', { cls: 'vault-sync-radio-label' });
        const radio = label.createEl('input', { type: 'radio' }) as HTMLInputElement;
        radio.name = name;
        radio.value = opt.value;
        radio.checked = opt.value === 'keep_both';
        label.createEl('span', { text: opt.label });

        radio.addEventListener('change', () => {
          if (radio.checked) this.resolutions.set(entry.path, opt.value);
        });
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
