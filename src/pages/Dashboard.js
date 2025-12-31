// Dashboard Page - Server list
import { t } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { api } from '../api/pterodactyl.js';
import { serversStore } from '../stores/index.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';

export function renderDashboard(container) {
    let servers = [];
    let loading = true;
    let error = null;

    async function loadServers() {
        loading = true;
        error = null;
        render();

        try {
            const response = await api.getServers();
            servers = response.data || [];
            serversStore.setState({ servers });
            loading = false;
        } catch (err) {
            error = err.message;
            loading = false;
            toast.error(t('errors.connection'), err.message);
        }
        render();

        // Load resource usage for each server
        for (const server of servers) {
            try {
                const resources = await api.getServerResources(server.attributes.identifier);
                server.resources = resources.attributes;
                render();
            } catch (e) {
                // Ignore resource fetch errors
            }
        }
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getStatusClass(state) {
        switch (state) {
            case 'running': return 'online';
            case 'offline': return 'offline';
            case 'starting': return 'starting';
            case 'stopping': return 'starting';
            default: return 'offline';
        }
    }

    function getStatusText(state) {
        switch (state) {
            case 'running': return t('server.online');
            case 'offline': return t('server.offline');
            case 'starting': return t('server.starting');
            case 'stopping': return t('server.stopping');
            default: return t('server.offline');
        }
    }

    function render() {
        const content = loading ? renderLoading() :
            error ? renderError() :
                servers.length === 0 ? renderEmpty() :
                    renderServers();

        container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${t('dashboard.title')}</h1>
          <p class="page-subtitle">${t('dashboard.subtitle')}</p>
        </div>
        <button class="btn btn-secondary" id="refresh-servers">
          ${icon('refresh')} ${t('common.refresh')}
        </button>
      </div>
      ${content}
    `;

        bindEvents();
    }

    function renderLoading() {
        return `
      <div class="grid grid-cols-3">
        ${Array(6).fill(0).map((_, i) => `
          <div class="card skeleton-card stagger-${i + 1}">
            <div class="skeleton" style="height: 24px; width: 60%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 16px; width: 40%; margin-bottom: 24px;"></div>
            <div class="skeleton" style="height: 8px; width: 100%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 8px; width: 100%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 8px; width: 100%;"></div>
          </div>
        `).join('')}
      </div>
    `;
    }

    function renderError() {
        return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('alertCircle', 64)}</div>
        <h3 class="empty-state-title">${t('errors.connection')}</h3>
        <p class="empty-state-text">${error}</p>
        <button class="btn btn-primary" id="retry-btn">
          ${icon('refresh')} ${t('common.refresh')}
        </button>
      </div>
    `;
    }

    function renderEmpty() {
        return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('server', 64)}</div>
        <h3 class="empty-state-title">${t('dashboard.noServers')}</h3>
        <p class="empty-state-text">${t('dashboard.noServersText')}</p>
      </div>
    `;
    }

    function renderServers() {
        return `
      <div class="grid grid-cols-3">
        ${servers.map((server, index) => {
            const attr = server.attributes;
            const res = server.resources || {};
            const state = res.current_state || 'offline';
            const statusClass = getStatusClass(state);

            const memoryPercent = attr.limits?.memory ?
                Math.round((res.resources?.memory_bytes || 0) / (attr.limits.memory * 1024 * 1024) * 100) : 0;
            const cpuPercent = Math.round(res.resources?.cpu_absolute || 0);
            const diskPercent = attr.limits?.disk ?
                Math.round((res.resources?.disk_bytes || 0) / (attr.limits.disk * 1024 * 1024) * 100) : 0;

            return `
            <div class="server-card hover-lift animate-cardPop stagger-${index + 1}" 
                 data-server="${attr.identifier}">
              <div class="server-card-header">
                <div class="server-status">
                  <span class="status-dot ${statusClass}"></span>
                  <span class="badge ${statusClass}">${getStatusText(state)}</span>
                </div>
                <div class="server-actions">
                  <button class="btn btn-icon btn-ghost power-btn" 
                          data-action="${state === 'running' ? 'restart' : 'start'}"
                          data-server="${attr.identifier}"
                          title="${state === 'running' ? t('server.restart') : t('server.start')}">
                    ${state === 'running' ? icon('refresh') : icon('play')}
                  </button>
                </div>
              </div>
              
              <h3 class="server-name">${attr.name}</h3>
              <p class="server-game">${attr.description || 'Minecraft Server'}</p>
              
              <div class="server-resources">
                <div class="resource-item">
                  <div class="resource-label">
                    <span>${t('server.cpu')}</span>
                    <span>${cpuPercent}%</span>
                  </div>
                  <div class="resource-bar">
                    <div class="resource-fill" style="width: ${Math.min(cpuPercent, 100)}%"></div>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">
                    <span>${t('server.memory')}</span>
                    <span>${formatBytes(res.resources?.memory_bytes || 0)} / ${attr.limits?.memory || 0} MB</span>
                  </div>
                  <div class="resource-bar">
                    <div class="resource-fill" style="width: ${Math.min(memoryPercent, 100)}%"></div>
                  </div>
                </div>
                <div class="resource-item">
                  <div class="resource-label">
                    <span>${t('server.disk')}</span>
                    <span>${formatBytes(res.resources?.disk_bytes || 0)}</span>
                  </div>
                  <div class="resource-bar">
                    <div class="resource-fill" style="width: ${Math.min(diskPercent, 100)}%"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }

    function bindEvents() {
        // Refresh button
        const refreshBtn = container.querySelector('#refresh-servers');
        refreshBtn?.addEventListener('click', loadServers);

        // Retry button
        const retryBtn = container.querySelector('#retry-btn');
        retryBtn?.addEventListener('click', loadServers);

        // Server cards - click to open
        container.querySelectorAll('.server-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.power-btn')) {
                    const serverId = card.dataset.server;
                    router.navigate(`/server/${serverId}`);
                }
            });
        });

        // Power buttons
        container.querySelectorAll('.power-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const serverId = btn.dataset.server;

                btn.disabled = true;
                btn.innerHTML = `<span class="spinner"></span>`;

                try {
                    if (action === 'start') {
                        await api.startServer(serverId);
                        toast.success(t('server.starting'), '');
                    } else if (action === 'restart') {
                        await api.restartServer(serverId);
                        toast.success(t('server.restart'), '');
                    }
                    setTimeout(loadServers, 2000);
                } catch (err) {
                    toast.error(t('common.error'), err.message);
                }

                btn.disabled = false;
            });
        });
    }

    loadServers();
}

// Add dashboard-specific styles
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
  .skeleton-card {
    height: 200px;
  }

  .resource-item {
    margin-bottom: var(--space-sm);
  }

  .server-actions {
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .server-card:hover .server-actions {
    opacity: 1;
  }
`;
document.head.appendChild(dashboardStyles);
