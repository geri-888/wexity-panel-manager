// Tools Page - Built-in utilities
import { t } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { api, uploadToMcLogs, searchHangarPlugins, searchModrinthProjects } from '../api/pterodactyl.js';
import { serversStore } from '../stores/index.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';
import { modal } from '../components/ui/Modal.js';

export function renderTools(container) {
    let activeTab = 'plugins';
    let searchQuery = '';
    let plugins = [];
    let searchLoading = false;
    let selectedServer = null;

    const servers = serversStore.getState().servers || [];

    async function searchPlugins() {
        if (!searchQuery.trim()) return;

        searchLoading = true;
        render();

        try {
            // Search both Hangar and Modrinth
            const [hangarRes, modrinthRes] = await Promise.allSettled([
                searchHangarPlugins(searchQuery),
                searchModrinthProjects(searchQuery)
            ]);

            plugins = [];

            if (hangarRes.status === 'fulfilled') {
                plugins.push(...hangarRes.value.result.map(p => ({
                    source: 'hangar',
                    name: p.name,
                    slug: p.namespace.slug,
                    description: p.description,
                    downloads: p.stats.downloads,
                    icon: p.avatarUrl
                })));
            }

            if (modrinthRes.status === 'fulfilled') {
                plugins.push(...modrinthRes.value.hits.map(p => ({
                    source: 'modrinth',
                    id: p.project_id,
                    name: p.title,
                    slug: p.slug,
                    description: p.description,
                    downloads: p.downloads,
                    icon: p.icon_url
                })));
            }

            // Sort by downloads
            plugins.sort((a, b) => b.downloads - a.downloads);

        } catch (err) {
            toast.error(t('common.error'), err.message);
        }

        searchLoading = false;
        render();
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function render() {
        container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${t('tools.title')}</h1>
        </div>
      </div>

      <div class="tabs" style="margin-bottom: var(--space-lg); max-width: 400px;">
        <button class="tab ${activeTab === 'plugins' ? 'active' : ''}" data-tab="plugins">
          ${icon('puzzle')} ${t('tools.plugins.title')}
        </button>
        <button class="tab ${activeTab === 'mclogs' ? 'active' : ''}" data-tab="mclogs">
          ${icon('upload')} ${t('tools.mclogs.title')}
        </button>
      </div>

      <div class="tools-content animate-fadeIn">
        ${activeTab === 'plugins' ? renderPlugins() : renderMcLogs()}
      </div>
    `;

        bindEvents();
    }

    function renderPlugins() {
        return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('tools.plugins.description')}</h3>
        </div>
        <div class="card-content">
          <div class="search-bar">
            <input type="text" class="input" id="plugin-search" 
                   placeholder="${t('tools.plugins.search')}"
                   value="${searchQuery}">
            <button class="btn btn-primary" id="search-btn">
              ${icon('search')} Search
            </button>
          </div>

          ${servers.length > 0 ? `
            <div class="server-select" style="margin-top: var(--space-md);">
              <label class="input-label">Target Server:</label>
              <select class="input select" id="target-server">
                <option value="">Select a server...</option>
                ${servers.map(s => `
                  <option value="${s.attributes.identifier}" ${selectedServer === s.attributes.identifier ? 'selected' : ''}>
                    ${s.attributes.name}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <div class="plugin-results" style="margin-top: var(--space-lg);">
            ${searchLoading ? `
              <div class="flex justify-center">
                <div class="spinner"></div>
              </div>
            ` : plugins.length > 0 ? `
              <div class="plugin-grid">
                ${plugins.map(plugin => `
                  <div class="plugin-card">
                    <div class="plugin-icon">
                      ${plugin.icon ? `<img src="${plugin.icon}" alt="${plugin.name}">` : icon('puzzle', 32)}
                    </div>
                    <div class="plugin-info">
                      <h4 class="plugin-name">${plugin.name}</h4>
                      <p class="plugin-desc">${plugin.description?.slice(0, 100) || ''}...</p>
                      <div class="plugin-meta">
                        <span class="badge">${plugin.source}</span>
                        <span class="text-muted">${icon('download', 14)} ${formatNumber(plugin.downloads)}</span>
                      </div>
                    </div>
                    <a href="${plugin.source === 'hangar'
                ? `https://hangar.papermc.io/${plugin.slug}`
                : `https://modrinth.com/plugin/${plugin.slug}`}" 
                       target="_blank" 
                       class="btn btn-sm btn-secondary">
                      ${icon('externalLink')} View
                    </a>
                  </div>
                `).join('')}
              </div>
            ` : searchQuery ? `
              <p class="text-center text-muted">No plugins found</p>
            ` : `
              <p class="text-center text-muted">Search for plugins...</p>
            `}
          </div>
        </div>
      </div>
    `;
    }

    function renderMcLogs() {
        return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${t('tools.mclogs.description')}</h3>
        </div>
        <div class="card-content">
          <div class="input-group">
            <label class="input-label">Paste log content:</label>
            <textarea class="input" id="log-content" rows="10" 
                      placeholder="Paste your server log here..."></textarea>
          </div>
          <div style="margin-top: var(--space-lg);">
            <button class="btn btn-primary" id="upload-log">
              ${icon('upload')} ${t('tools.mclogs.upload')}
            </button>
          </div>

          <div id="mclogs-result" class="hidden" style="margin-top: var(--space-lg);">
            <div class="card" style="background: var(--glass-bg); padding: var(--space-md);">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-muted">MCLogs Link:</span>
                  <a href="" id="mclogs-link" target="_blank" class="mclogs-url"></a>
                </div>
                <button class="btn btn-sm btn-secondary" id="copy-link">
                  ${icon('copy')} ${t('common.copy')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    function bindEvents() {
        // Tabs
        container.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.tab;
                render();
            });
        });

        // Plugin search
        const searchInput = container.querySelector('#plugin-search');
        const searchBtn = container.querySelector('#search-btn');

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = searchInput.value;
                searchPlugins();
            }
        });

        searchBtn?.addEventListener('click', () => {
            searchQuery = searchInput.value;
            searchPlugins();
        });

        // Server select
        container.querySelector('#target-server')?.addEventListener('change', (e) => {
            selectedServer = e.target.value;
        });

        // MCLogs upload
        container.querySelector('#upload-log')?.addEventListener('click', async () => {
            const content = container.querySelector('#log-content')?.value;
            if (!content?.trim()) {
                toast.warning(t('common.warning'), 'Please paste log content first');
                return;
            }

            try {
                const url = await uploadToMcLogs(content);
                const resultEl = container.querySelector('#mclogs-result');
                const linkEl = container.querySelector('#mclogs-link');

                if (resultEl && linkEl) {
                    linkEl.href = url;
                    linkEl.textContent = url;
                    resultEl.classList.remove('hidden');
                }

                await navigator.clipboard.writeText(url);
                toast.success(t('console.mclogsSuccess'), '');
            } catch (err) {
                toast.error(t('console.mclogsError'), err.message);
            }
        });

        // Copy link
        container.querySelector('#copy-link')?.addEventListener('click', async () => {
            const url = container.querySelector('#mclogs-link')?.href;
            if (url) {
                await navigator.clipboard.writeText(url);
                toast.success(t('common.copied'), '');
            }
        });
    }

    render();
}

// Tools styles
const toolsStyles = document.createElement('style');
toolsStyles.textContent = `
  .search-bar {
    display: flex;
    gap: var(--space-md);
  }

  .search-bar .input {
    flex: 1;
  }

  .plugin-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .plugin-card {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .plugin-card:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }

  .plugin-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .plugin-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .plugin-info {
    flex: 1;
    min-width: 0;
  }

  .plugin-name {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .plugin-desc {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plugin-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-sm);
  }

  .mclogs-url {
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }
`;
document.head.appendChild(toolsStyles);
