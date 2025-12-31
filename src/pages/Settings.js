// Settings Page
import { t } from '../lib/i18n.js';
import { i18n } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { authStore, settingsStore, setTheme, setAccessCode, resetAll } from '../stores/index.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';
import { modal } from '../components/ui/Modal.js';

export function renderSettings(container) {
    const auth = authStore.getState();
    const settings = settingsStore.getState();

    function render() {
        container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${t('settings.title')}</h1>
        </div>
      </div>

      <div class="settings-grid">
        <!-- API Settings -->
        <div class="card animate-cardPop stagger-1">
          <div class="card-header">
            <h3 class="card-title">${icon('server')} ${t('settings.panel')}</h3>
          </div>
          <div class="card-content">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.panelUrl')}</span>
                <span class="setting-value text-muted">${auth.panelUrl || 'Not set'}</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.apiKey')}</span>
                <span class="setting-value text-muted">••••••••••••••••</span>
              </div>
              <button class="btn btn-sm btn-secondary" id="change-api-key">
                ${t('settings.changeApiKey')}
              </button>
            </div>
          </div>
        </div>

        <!-- Security -->
        <div class="card animate-cardPop stagger-2">
          <div class="card-header">
            <h3 class="card-title">${icon('power')} ${t('settings.account')}</h3>
          </div>
          <div class="card-content">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.accessCode')}</span>
                <span class="setting-value text-muted">${auth.hasAccessCode ? '••••' : 'Not set'}</span>
              </div>
              <div class="flex gap-sm">
                <button class="btn btn-sm btn-secondary" id="change-code">
                  ${auth.hasAccessCode ? t('settings.changeCode') : 'Set Code'}
                </button>
                ${auth.hasAccessCode ? `
                  <button class="btn btn-sm btn-ghost" id="remove-code">
                    ${t('settings.removeCode')}
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Appearance -->
        <div class="card animate-cardPop stagger-3">
          <div class="card-header">
            <h3 class="card-title">${icon('palette')} ${t('settings.appearance')}</h3>
          </div>
          <div class="card-content">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.theme')}</span>
              </div>
              <div class="theme-switcher">
                ${['dark', 'light', 'cyberpunk', 'ocean', 'sunset'].map(theme => `
                  <button class="theme-option ${settings.theme === theme ? 'active' : ''}" 
                          data-theme="${theme}" 
                          title="${t(`themes.${theme}`)}">
                    <span class="theme-dot ${theme}"></span>
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.language')}</span>
              </div>
              <div class="language-switcher">
                <button class="lang-option ${i18n.locale === 'en' ? 'active' : ''}" data-lang="en">
                  🇬🇧 EN
                </button>
                <button class="lang-option ${i18n.locale === 'hu' ? 'active' : ''}" data-lang="hu">
                  🇭🇺 HU
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card animate-cardPop stagger-4 danger-card">
          <div class="card-header">
            <h3 class="card-title" style="color: var(--accent-danger);">
              ${icon('alertCircle')} ${t('settings.danger')}
            </h3>
          </div>
          <div class="card-content">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">${t('settings.reset')}</span>
                <span class="setting-value text-muted">Clear all stored data</span>
              </div>
              <button class="btn btn-sm btn-danger" id="reset-all">
                ${t('settings.reset')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

        bindEvents();
    }

    function bindEvents() {
        // Theme switcher
        container.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                setTheme(btn.dataset.theme);
                render();
            });
        });

        // Language switcher
        container.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                await i18n.setLocale(btn.dataset.lang);
                render();
            });
        });

        // Change API key
        container.querySelector('#change-api-key')?.addEventListener('click', () => {
            modal.prompt({
                title: t('settings.changeApiKey'),
                message: 'Enter your new Client API key',
                placeholder: 'ptlc_xxxxxxxxxxxxxxxx',
                onSubmit: (key) => {
                    if (key) {
                        localStorage.setItem('wexity_api_key', key);
                        authStore.setState({ apiKey: key });
                        toast.success(t('common.success'), 'API key updated');
                    }
                }
            });
        });

        // Change access code
        container.querySelector('#change-code')?.addEventListener('click', () => {
            modal.show({
                title: t('settings.changeCode'),
                content: `
          <div class="pin-input-container" id="new-pin-container">
            <input type="password" class="pin-digit" maxlength="1" data-index="0" inputmode="numeric">
            <input type="password" class="pin-digit" maxlength="1" data-index="1" inputmode="numeric">
            <input type="password" class="pin-digit" maxlength="1" data-index="2" inputmode="numeric">
            <input type="password" class="pin-digit" maxlength="1" data-index="3" inputmode="numeric">
          </div>
        `,
                actions: [
                    { label: t('common.cancel'), variant: 'btn-secondary' },
                    {
                        label: t('common.save'),
                        variant: 'btn-primary',
                        onClick: () => {
                            const pins = document.querySelectorAll('#new-pin-container .pin-digit');
                            const code = Array.from(pins).map(p => p.value).join('');
                            if (code.length === 4) {
                                setAccessCode(code);
                                toast.success(t('common.success'), 'Access code updated');
                                render();
                            }
                        }
                    }
                ]
            });

            // Setup PIN input behavior
            setTimeout(() => {
                const pins = document.querySelectorAll('#new-pin-container .pin-digit');
                pins.forEach((input, index) => {
                    input.addEventListener('input', (e) => {
                        if (e.target.value && index < pins.length - 1) {
                            pins[index + 1].focus();
                        }
                    });
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !e.target.value && index > 0) {
                            pins[index - 1].focus();
                        }
                    });
                });
                pins[0].focus();
            }, 100);
        });

        // Remove access code
        container.querySelector('#remove-code')?.addEventListener('click', () => {
            modal.confirm({
                title: t('settings.removeCode'),
                message: 'Are you sure you want to remove the access code?',
                onConfirm: () => {
                    setAccessCode(null);
                    toast.success(t('common.success'), 'Access code removed');
                    render();
                }
            });
        });

        // Reset all
        container.querySelector('#reset-all')?.addEventListener('click', () => {
            modal.confirm({
                title: t('settings.reset'),
                message: t('settings.resetConfirm'),
                confirmText: t('settings.reset'),
                danger: true,
                onConfirm: () => {
                    resetAll();
                    router.navigate('/setup');
                }
            });
        });
    }

    render();
}

// Settings styles
const settingsStyles = document.createElement('style');
settingsStyles.textContent = `
  .settings-grid {
    display: grid;
    gap: var(--space-lg);
    max-width: 800px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--glass-border);
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-label {
    font-weight: 500;
    display: block;
    margin-bottom: 2px;
  }

  .setting-value {
    font-size: 0.875rem;
  }

  .theme-switcher, .language-switcher {
    display: flex;
    gap: var(--space-sm);
  }

  .theme-option {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    border: 2px solid var(--glass-border);
    background: var(--glass-bg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .theme-option:hover {
    border-color: var(--glass-border-hover);
  }

  .theme-option.active {
    border-color: var(--accent-primary);
  }

  .theme-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }

  .theme-dot.dark { background: linear-gradient(135deg, #0a0a0a, #333); }
  .theme-dot.light { background: linear-gradient(135deg, #fff, #e5e5e5); }
  .theme-dot.cyberpunk { background: linear-gradient(135deg, #ff00ff, #00ffff); }
  .theme-dot.ocean { background: linear-gradient(135deg, #0ea5e9, #22d3ee); }
  .theme-dot.sunset { background: linear-gradient(135deg, #f97316, #ec4899); }

  .lang-option {
    padding: var(--space-sm) var(--space-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: var(--font-family);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .lang-option:hover {
    background: var(--glass-bg-hover);
  }

  .lang-option.active {
    background: var(--gradient-primary);
    border-color: transparent;
    color: white;
  }

  .danger-card {
    border-color: rgba(239, 68, 68, 0.3);
  }
`;
document.head.appendChild(settingsStyles);
