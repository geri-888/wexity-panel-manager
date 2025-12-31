// Server Page - Individual server management
import { t } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { api } from '../api/pterodactyl.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';
import { modal } from '../components/ui/Modal.js';

export function renderServer(container, serverId) {
    let server = null;
    let resources = null;
    let loading = true;
    let activeTab = 'console';
    let consoleLines = [];
    let ws = null;

    async function loadServer() {
        loading = true;
        render();

        try {
            const serverRes = await api.getServer(serverId);
            server = serverRes.attributes;

            const resourcesRes = await api.getServerResources(serverId);
            resources = resourcesRes.attributes;

            loading = false;
            render();

            if (activeTab === 'console') {
                connectWebSocket();
            }
        } catch (err) {
            toast.error(t('errors.connection'), err.message);
            loading = false;
            render();
        }
    }

    async function connectWebSocket() {
        try {
            const wsData = await api.getServerWebsocket(serverId);
            const { token, socket } = wsData.data;

            ws = new WebSocket(socket);

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    event: 'auth',
                    args: [token]
                }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'console output') {
                    consoleLines.push(...data.args);
                    if (consoleLines.length > 500) {
                        consoleLines = consoleLines.slice(-500);
                    }
                    updateConsole();
                } else if (data.event === 'status') {
                    resources = { ...resources, current_state: data.args[0] };
                    updateStatus();
                }
            };

            ws.onerror = () => {
                toast.warning(t('console.title'), 'WebSocket connection failed');
            };
        } catch (err) {
            console.error('WebSocket error:', err);
        }
    }

    function updateConsole() {
        const consoleEl = container.querySelector('#console-output');
        if (consoleEl) {
            consoleEl.innerHTML = consoleLines.map(line =>
                `<div class="console-line">${escapeHtml(line)}</div>`
            ).join('');
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    function updateStatus() {
        const statusEl = container.querySelector('.status-badge');
        if (statusEl && resources) {
            const state = resources.current_state;
            statusEl.className = `badge ${getStatusClass(state)}`;
            statusEl.textContent = getStatusText(state);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStatusClass(state) {
        switch (state) {
            case 'running': return 'success';
            case 'offline': return 'danger';
            case 'starting': case 'stopping': return 'warning';
            default: return '';
        }
    }

    function getStatusText(state) {
        switch (state) {
            case 'running': return t('server.online');
            case 'offline': return t('server.offline');
            case 'starting': return t('server.starting');
            case 'stopping': return t('server.stopping');
            default: return state;
        }
    }

    function render() {
        const state = resources?.current_state || 'offline';

        container.innerHTML = `
      <div class="page-header">
        <div class="flex items-center gap-md">
          <button class="btn btn-ghost btn-icon" id="back-btn">
            ${icon('chevronLeft')}
          </button>
          <div>
            <h1 class="page-title">${server?.name || t('common.loading')}</h1>
            <div class="flex items-center gap-sm">
              <span class="badge status-badge ${getStatusClass(state)}">${getStatusText(state)}</span>
              <span class="text-muted">${server?.description || ''}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-secondary" id="start-btn" ${state === 'running' ? 'disabled' : ''}>
            ${icon('play')} ${t('server.start')}
          </button>
          <button class="btn btn-secondary" id="restart-btn" ${state !== 'running' ? 'disabled' : ''}>
            ${icon('refresh')} ${t('server.restart')}
          </button>
          <button class="btn btn-danger" id="stop-btn" ${state !== 'running' ? 'disabled' : ''}>
            ${icon('stop')} ${t('server.stop')}
          </button>
        </div>
      </div>

      <div class="tabs" style="margin-bottom: var(--space-lg);">
        <button class="tab ${activeTab === 'console' ? 'active' : ''}" data-tab="console">
          ${icon('terminal')} ${t('console.title')}
        </button>
        <button class="tab ${activeTab === 'files' ? 'active' : ''}" data-tab="files">
          ${icon('folder')} ${t('files.title')}
        </button>
        <button class="tab ${activeTab === 'databases' ? 'active' : ''}" data-tab="databases">
          ${icon('database')} ${t('nav.databases')}
        </button>
        <button class="tab ${activeTab === 'backups' ? 'active' : ''}" data-tab="backups">
          ${icon('archive')} ${t('nav.backups')}
        </button>
      </div>

      <div class="tab-content animate-fadeIn">
        ${renderTabContent()}
      </div>
    `;

        bindEvents();
    }

    function renderTabContent() {
        switch (activeTab) {
            case 'console':
                return `
          <div class="console-container">
            <div class="console-header">
              <span>${t('console.title')}</span>
              <div class="flex gap-sm">
                <button class="btn btn-sm btn-secondary" id="upload-mclogs">
                  ${icon('upload')} ${t('console.uploadToMclogs')}
                </button>
                <button class="btn btn-sm btn-ghost" id="clear-console">
                  ${icon('trash')} ${t('console.clear')}
                </button>
              </div>
            </div>
            <div class="console-terminal" id="console-output">
              ${consoleLines.map(line =>
                    `<div class="console-line">${escapeHtml(line)}</div>`
                ).join('')}
            </div>
            <div class="console-input-container">
              <input type="text" class="console-input" id="command-input" 
                     placeholder="${t('console.placeholder')}">
              <button class="btn btn-primary" id="send-command">
                ${t('console.send')}
              </button>
            </div>
          </div>
        `;
            case 'files':
                return `
          <div class="card">
            <p class="text-center text-muted" style="padding: var(--space-xl);">
              ${icon('folder', 40)}
              <br><br>
              File manager will open in full page mode.
              <br><br>
              <a href="/server/${serverId}/files" class="btn btn-primary">
                ${icon('folder')} Open File Manager
              </a>
            </p>
          </div>
        `;
            case 'databases':
            case 'backups':
                return `
          <div class="card">
            <p class="text-center text-muted" style="padding: var(--space-xl);">
              Coming soon...
            </p>
          </div>
        `;
            default:
                return '';
        }
    }

    function bindEvents() {
        // Back button
        container.querySelector('#back-btn')?.addEventListener('click', () => {
            if (ws) ws.close();
            router.navigate('/');
        });

        // Power controls
        container.querySelector('#start-btn')?.addEventListener('click', async () => {
            try {
                await api.startServer(serverId);
                toast.success(t('server.starting'), '');
            } catch (err) {
                toast.error(t('common.error'), err.message);
            }
        });

        container.querySelector('#restart-btn')?.addEventListener('click', async () => {
            try {
                await api.restartServer(serverId);
                toast.success(t('server.restart'), '');
            } catch (err) {
                toast.error(t('common.error'), err.message);
            }
        });

        container.querySelector('#stop-btn')?.addEventListener('click', async () => {
            modal.confirm({
                title: t('server.stop'),
                message: 'Are you sure you want to stop this server?',
                confirmText: t('server.stop'),
                danger: true,
                onConfirm: async () => {
                    try {
                        await api.stopServer(serverId);
                        toast.success(t('server.stopping'), '');
                    } catch (err) {
                        toast.error(t('common.error'), err.message);
                    }
                }
            });
        });

        // Tabs
        container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.tab;
                if (activeTab === 'files') {
                    router.navigate(`/server/${serverId}/files`);
                    return;
                }
                render();
                if (activeTab === 'console' && !ws) {
                    connectWebSocket();
                }
            });
        });

        // Console commands
        const commandInput = container.querySelector('#command-input');
        const sendBtn = container.querySelector('#send-command');

        const sendCommand = async () => {
            const command = commandInput?.value.trim();
            if (!command) return;

            try {
                await api.sendCommand(serverId, command);
                commandInput.value = '';
            } catch (err) {
                toast.error(t('common.error'), err.message);
            }
        };

        sendBtn?.addEventListener('click', sendCommand);
        commandInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendCommand();
        });

        // Clear console
        container.querySelector('#clear-console')?.addEventListener('click', () => {
            consoleLines = [];
            updateConsole();
        });

        // MCLogs upload
        container.querySelector('#upload-mclogs')?.addEventListener('click', async () => {
            if (consoleLines.length === 0) {
                toast.warning(t('common.warning'), 'No console output to upload');
                return;
            }

            try {
                const { uploadToMcLogs } = await import('../api/pterodactyl.js');
                const url = await uploadToMcLogs(consoleLines.join('\n'));
                await navigator.clipboard.writeText(url);
                toast.success(t('console.mclogsSuccess'), url);
            } catch (err) {
                toast.error(t('console.mclogsError'), err.message);
            }
        });
    }

    // Cleanup on navigate away
    const cleanup = () => {
        if (ws) {
            ws.close();
            ws = null;
        }
    };

    window.addEventListener('beforeunload', cleanup);

    loadServer();

    return cleanup;
}

// Console styles
const consoleStyles = document.createElement('style');
consoleStyles.textContent = `
  .console-terminal {
    height: 400px;
    overflow-y: auto;
    padding: var(--space-md);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.5;
    background: #0d0d0d;
  }

  .console-line {
    white-space: pre-wrap;
    word-break: break-all;
  }
`;
document.head.appendChild(consoleStyles);
