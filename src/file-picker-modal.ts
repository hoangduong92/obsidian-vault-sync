// File picker modal — select which vault files/folders to include in sync

import { App, Modal, TFile } from 'obsidian';

interface FileGroup {
  folder: string;    // top-level folder name ('' for root files)
  files: TFile[];
}

interface FilePickerOptions {
  initialPaths: string[];  // previously selected paths
  onConfirm: (selectedPaths: string[]) => void;
  onCancel?: () => void;
}

export class FilePickerModal extends Modal {
  private opts: FilePickerOptions;
  private checkedPaths: Set<string>;
  private summaryEl!: HTMLElement;
  private allFiles: TFile[] = [];

  constructor(app: App, opts: FilePickerOptions) {
    super(app);
    this.opts = opts;
    this.checkedPaths = new Set(opts.initialPaths);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass('vault-sync-picker-modal');

    contentEl.createEl('h2', { text: 'Select Files to Sync' });

    // Select all / Deselect all buttons
    const headerRow = contentEl.createDiv({ cls: 'vault-sync-btn-row vault-sync-btn-row--left' });
    const selectAllBtn = headerRow.createEl('button', { text: 'Select All' });
    const deselectAllBtn = headerRow.createEl('button', { text: 'Deselect All' });

    // File tree container
    const treeEl = contentEl.createDiv({ cls: 'vault-sync-tree' });

    // Summary line
    this.summaryEl = contentEl.createEl('p', { cls: 'vault-sync-summary' });

    // Bottom buttons
    const btnRow = contentEl.createDiv({ cls: 'vault-sync-btn-row' });
    const confirmBtn = btnRow.createEl('button', { text: 'Confirm', cls: 'mod-cta' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });

    // Load files and render
    this.allFiles = this.app.vault.getFiles();
    // Default: select all if no prior selection
    if (this.checkedPaths.size === 0) {
      this.allFiles.forEach(f => this.checkedPaths.add(f.path));
    }

    const groups = this.groupByTopFolder(this.allFiles);
    this.renderTree(treeEl, groups);
    this.updateSummary();

    // Event handlers
    selectAllBtn.addEventListener('click', () => {
      this.allFiles.forEach(f => this.checkedPaths.add(f.path));
      this.renderTree(treeEl, groups);
      this.updateSummary();
    });

    deselectAllBtn.addEventListener('click', () => {
      this.checkedPaths.clear();
      this.renderTree(treeEl, groups);
      this.updateSummary();
    });

    confirmBtn.addEventListener('click', () => {
      this.opts.onConfirm([...this.checkedPaths]);
      this.close();
    });

    cancelBtn.addEventListener('click', () => {
      this.opts.onCancel?.();
      this.close();
    });
  }

  private groupByTopFolder(files: TFile[]): FileGroup[] {
    const map = new Map<string, TFile[]>();
    for (const f of files) {
      const parts = f.path.split('/');
      const folder = parts.length > 1 ? parts[0] : '';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(f);
    }
    // Sort: root files first, then folders alphabetically
    return [...map.entries()]
      .sort((a, b) => {
        if (a[0] === '') return -1;
        if (b[0] === '') return 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([folder, files]) => ({ folder, files }));
  }

  private renderTree(container: HTMLElement, groups: FileGroup[]): void {
    container.empty();
    for (const group of groups) {
      if (group.folder !== '') {
        this.renderFolderGroup(container, group);
      } else {
        // Root-level files — no folder header
        for (const file of group.files) {
          this.renderFileRow(container, file, 0);
        }
      }
    }
  }

  private renderFolderGroup(container: HTMLElement, group: FileGroup): void {
    const folderFiles = group.files;
    const allChecked = folderFiles.every(f => this.checkedPaths.has(f.path));

    const folderRow = container.createDiv({ cls: 'vault-sync-checkbox vault-sync-checkbox--folder' });
    const cb = folderRow.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
    cb.checked = allChecked;
    cb.indeterminate = !allChecked && folderFiles.some(f => this.checkedPaths.has(f.path));
    folderRow.createEl('span', { text: group.folder + '/' });

    cb.addEventListener('change', () => {
      if (cb.checked) {
        folderFiles.forEach(f => this.checkedPaths.add(f.path));
      } else {
        folderFiles.forEach(f => this.checkedPaths.delete(f.path));
      }
      // Re-render children
      const childContainer = folderRow.nextElementSibling as HTMLElement;
      if (childContainer) {
        for (let i = 0; i < folderFiles.length; i++) {
          const childCb = childContainer.children[i]?.querySelector('input') as HTMLInputElement;
          if (childCb) childCb.checked = cb.checked;
        }
      }
      this.updateSummary();
    });

    // Child files
    const childContainer = container.createDiv({ cls: 'vault-sync-tree-children' });
    for (const file of folderFiles) {
      this.renderFileRow(childContainer, file, 1);
    }
  }

  private renderFileRow(container: HTMLElement, file: TFile, indent: number): void {
    const row = container.createDiv({ cls: 'vault-sync-checkbox' });
    if (indent > 0) row.addClass('vault-sync-checkbox--child');

    const cb = row.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
    cb.checked = this.checkedPaths.has(file.path);
    row.createEl('span', { text: file.name });

    cb.addEventListener('change', () => {
      if (cb.checked) {
        this.checkedPaths.add(file.path);
      } else {
        this.checkedPaths.delete(file.path);
      }
      this.updateSummary();
    });
  }

  private updateSummary(): void {
    const count = this.checkedPaths.size;
    const totalBytes = this.allFiles
      .filter(f => this.checkedPaths.has(f.path))
      .reduce((sum, f) => sum + f.stat.size, 0);
    this.summaryEl.textContent = `Selected: ${count} file(s) (${formatSize(totalBytes)})`;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
