// Files Page - File manager with versioning
import { t } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { api } from '../api/pterodactyl.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';
import { modal } from '../components/ui/Modal.js';

// File versions stored in IndexedDB
const DB_NAME = 'wexity-file-versions';
const DB_VERSION = 1;

let db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('versions')) {
                const store = database.createObjectStore('versions', { keyPath: 'id', autoIncrement: true });
                store.createIndex('file', 'file', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function saveVersion(serverId, filePath, content) {
    if (!db) await initDB();

    const tx = db.transaction('versions', 'readwrite');
    const store = tx.objectStore('versions');

    const version = {
        serverId,
        file: `${serverId}:${filePath}`,
        path: filePath,
        content,
        timestamp: Date.now()
    };

    store.add(version);

    // Keep only last 10 versions per file
    const index = store.index('file');
    const fileKey = `${serverId}:${filePath}`;
    const request = index.getAll(fileKey);

    request.onsuccess = () => {
        const versions = request.result;
        if (versions.length > 10) {
            const toDelete = versions.slice(0, versions.length - 10);
            toDelete.forEach(v => store.delete(v.id));
        }
    };
}

async function getVersions(serverId, filePath) {
    if (!db) await initDB();

    return new Promise((resolve) => {
        const tx = db.transaction('versions', 'readonly');
        const store = tx.objectStore('versions');
        const index = store.index('file');
        const fileKey = `${serverId}:${filePath}`;

        const request = index.getAll(fileKey);
        request.onsuccess = () => resolve(request.result.reverse());
        request.onerror = () => resolve([]);
    });
}

export function renderFiles(container, serverId) {
    let currentPath = '/';
    let files = [];
    let loading = true;
    let selectedFile = null;
    let fileContent = '';
    let originalContent = '';
    let showVersions = false;
    let versions = [];

    async function loadFiles(path = '/') {
        loading = true;
        currentPath = path;
        render();

        try {
            const response = await api.listFiles(serverId, path);
            files = response.data || [];
            files.sort((a, b) => {
                if (a.attributes.is_file === b.attributes.is_file) {
                    return a.attributes.name.localeCompare(b.attributes.name);
                }
                return a.attributes.is_file ? 1 : -1;
            });
            loading = false;
        } catch (err) {
            toast.error(t('errors.connection'), err.message);
            loading = false;
        }
        render();
    }

    async function openFile(file) {
        const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

        try {
            const content = await api.getFileContents(serverId, path);
            selectedFile = { ...file, path };
            fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            originalContent = fileContent;
            showVersions = false;
            render();
        } catch (err) {
            toast.error(t('common.error'), err.message);
        }
    }

    async function saveFile() {
        if (!selectedFile) return;

        try {
            // Save version before overwriting
            await saveVersion(serverId, selectedFile.path, originalContent);

            await api.writeFile(serverId, selectedFile.path, fileContent);
            originalContent = fileContent;
            toast.success(t('files.saveSuccess'), '');
        } catch (err) {
            toast.error(t('files.saveError'), err.message);
        }
    }

    async function loadVersions() {
        if (!selectedFile) return;
        versions = await getVersions(serverId, selectedFile.path);
        showVersions = true;
        render();
    }

    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getFileIcon(name, isFile) {
        if (!isFile) return icon('folder', 18);

        const ext = name.split('.').pop()?.toLowerCase();
        const codeExts = ['js', 'ts', 'json', 'yml', 'yaml', 'properties', 'toml', 'xml', 'html', 'css'];

        if (codeExts.includes(ext)) return icon('fileCode', 18);
        return icon('file', 18);
    }

    function getLanguage(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const langMap = {
            'js': 'javascript',
            'json': 'json',
            'yml': 'yaml',
            'yaml': 'yaml',
            'properties': 'properties',
            'toml': 'toml',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'md': 'markdown',
            'txt': 'text',
            'log': 'text',
            'sh': 'bash'
        };
        return langMap[ext] || 'text';
    }

    function render() {
        container.innerHTML = `
      <div class="page-header">
        <div class="flex items-center gap-md">
          <button class="btn btn-ghost btn-icon" id="back-btn">
            ${icon('chevronLeft')}
          </button>
          <div>
            <h1 class="page-title">${t('files.title')}</h1>
            <p class="page-subtitle text-muted">${currentPath}</p>
          </div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-secondary" id="new-folder-btn">
            ${icon('plus')} ${t('files.newFolder')}
          </button>
          <button class="btn btn-primary" id="upload-btn">
            ${icon('upload')} ${t('files.upload')}
          </button>
        </div>
      </div>

      <div class="file-browser">
        <div class="file-tree">
          <div class="breadcrumbs">
            ${renderBreadcrumbs()}
          </div>
          <div class="file-list">
            ${loading ? renderLoading() : renderFileList()}
          </div>
        </div>
        
        <div class="file-editor ${selectedFile ? '' : 'empty'}">
          ${selectedFile ? renderEditor() : renderEmptyEditor()}
        </div>
      </div>

      ${showVersions ? renderVersionsPanel() : ''}
    `;

        bindEvents();
    }

    function renderBreadcrumbs() {
        const parts = currentPath.split('/').filter(Boolean);
        let path = '';

        return `
      <div class="breadcrumb-list">
        <button class="breadcrumb-item" data-path="/">
          ${icon('home', 16)} root
        </button>
        ${parts.map(part => {
            path += '/' + part;
            return `
            <span class="breadcrumb-sep">/</span>
            <button class="breadcrumb-item" data-path="${path}">${part}</button>
          `;
        }).join('')}
      </div>
    `;
    }

    function renderLoading() {
        return `
      <div class="flex justify-center" style="padding: var(--space-xl);">
        <div class="spinner"></div>
      </div>
    `;
    }

    function renderFileList() {
        if (files.length === 0) {
            return `
        <div class="empty-state" style="padding: var(--space-lg);">
          <p class="text-muted">Empty directory</p>
        </div>
      `;
        }

        return files.map(file => {
            const attr = file.attributes;
            const isSelected = selectedFile?.path === (currentPath === '/' ? `/${attr.name}` : `${currentPath}/${attr.name}`);

            return `
        <div class="file-item ${isSelected ? 'selected' : ''} ${attr.is_file ? '' : 'folder'}" 
             data-name="${attr.name}" 
             data-is-file="${attr.is_file}">
          <span class="file-icon">${getFileIcon(attr.name, attr.is_file)}</span>
          <span class="file-name">${attr.name}</span>
          ${attr.is_file ? `<span class="file-size">${formatSize(attr.size)}</span>` : ''}
        </div>
      `;
        }).join('');
    }

    function renderEditor() {
        const hasChanges = fileContent !== originalContent;

        return `
      <div class="editor-header">
        <div class="flex items-center gap-md">
          <span class="file-icon">${getFileIcon(selectedFile.name, true)}</span>
          <span class="editor-filename">${selectedFile.name}</span>
          ${hasChanges ? '<span class="badge warning">Modified</span>' : ''}
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-ghost btn-sm" id="versions-btn">
            ${icon('history')} ${t('files.versions')}
          </button>
          <button class="btn btn-primary btn-sm" id="save-btn" ${!hasChanges ? 'disabled' : ''}>
            ${icon('save')} ${t('files.save')}
          </button>
        </div>
      </div>
      <div class="editor-content">
        <textarea class="code-editor" id="code-editor" spellcheck="false">${escapeHtml(fileContent)}</textarea>
      </div>
    `;
    }

    function renderEmptyEditor() {
        return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('file', 48)}</div>
        <p class="text-muted">Select a file to edit</p>
      </div>
    `;
    }

    function renderVersionsPanel() {
        return `
      <div class="modal-backdrop" id="versions-backdrop"></div>
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">${t('files.versions')}</h3>
          <button class="btn btn-ghost btn-icon" id="close-versions">
            ${icon('x')}
          </button>
        </div>
        <div class="modal-body">
          ${versions.length === 0 ? `
            <p class="text-center text-muted">${t('files.noVersions')}</p>
          ` : `
            <div class="version-list">
              ${versions.map((v, i) => `
                <div class="version-item" data-index="${i}">
                  <div class="version-info">
                    <span class="version-date">${formatDate(v.timestamp)}</span>
                    <span class="text-muted">${formatSize(v.content.length)} bytes</span>
                  </div>
                  <button class="btn btn-sm btn-secondary" data-restore="${i}">
                    ${icon('refresh')} ${t('files.restoreVersion')}
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function bindEvents() {
        // Back button
        container.querySelector('#back-btn')?.addEventListener('click', () => {
            router.navigate(`/server/${serverId}`);
        });

        // Breadcrumbs
        container.querySelectorAll('.breadcrumb-item').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedFile = null;
                loadFiles(btn.dataset.path);
            });
        });

        // File items
        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name;
                const isFile = item.dataset.isFile === 'true';

                if (isFile) {
                    openFile({ name });
                } else {
                    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                    selectedFile = null;
                    loadFiles(newPath);
                }
            });
        });

        // Code editor
        const codeEditor = container.querySelector('#code-editor');
        codeEditor?.addEventListener('input', (e) => {
            fileContent = e.target.value;
            render();
        });

        // Save button
        container.querySelector('#save-btn')?.addEventListener('click', saveFile);

        // Keyboard shortcut for save
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedFile) {
                e.preventDefault();
                saveFile();
            }
        });

        // Versions button
        container.querySelector('#versions-btn')?.addEventListener('click', loadVersions);

        // Close versions
        container.querySelector('#close-versions')?.addEventListener('click', () => {
            showVersions = false;
            render();
        });
        container.querySelector('#versions-backdrop')?.addEventListener('click', () => {
            showVersions = false;
            render();
        });

        // Restore version
        container.querySelectorAll('[data-restore]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.restore);
                const version = versions[index];
                if (version) {
                    fileContent = version.content;
                    showVersions = false;
                    toast.success(t('files.restoreVersion'), formatDate(version.timestamp));
                    render();
                }
            });
        });

        // New folder
        container.querySelector('#new-folder-btn')?.addEventListener('click', () => {
            modal.prompt({
                title: t('files.newFolder'),
                placeholder: 'folder-name',
                onSubmit: async (name) => {
                    if (!name) return;
                    try {
                        await api.createFolder(serverId, currentPath, name);
                        toast.success(t('common.success'), '');
                        loadFiles(currentPath);
                    } catch (err) {
                        toast.error(t('common.error'), err.message);
                    }
                }
            });
        });
    }

    initDB();
    loadFiles();
}

// File manager styles
const filesStyles = document.createElement('style');
filesStyles.textContent = `
  .breadcrumb-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs);
    padding: var(--space-md);
    border-bottom: 1px solid var(--glass-border);
  }

  .breadcrumb-item {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-family);
    font-size: 0.875rem;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    transition: all var(--transition-fast);
  }

  .breadcrumb-item:hover {
    background: var(--glass-bg);
    color: var(--text-primary);
  }

  .breadcrumb-sep {
    color: var(--text-muted);
  }

  .file-list {
    overflow-y: auto;
    max-height: calc(100vh - 350px);
  }

  .file-item .file-size {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .file-editor.empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .editor-filename {
    font-weight: 500;
  }

  .code-editor {
    width: 100%;
    height: calc(100vh - 350px);
    background: #0d0d0d;
    color: var(--text-primary);
    border: none;
    padding: var(--space-md);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.6;
    resize: none;
    outline: none;
  }

  .version-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .version-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: var(--glass-bg);
    border-radius: var(--radius-md);
  }

  .version-date {
    font-weight: 500;
  }
`;
document.head.appendChild(filesStyles);
