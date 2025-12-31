// Setup Page - First time configuration
import { t } from '../lib/i18n.js';
import { i18n } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { setCredentials, setAccessCode, settingsStore, setTheme } from '../stores/index.js';
import { icon } from '../components/ui/Icons.js';
import { toast } from '../components/ui/Toast.js';

export function renderSetup(container) {
    let step = 1;
    let panelUrl = '';
    let apiKey = '';
    let accessCode = '';
    let selectedTheme = settingsStore.getState().theme;
    let selectedLocale = i18n.locale;

    function render() {
        container.innerHTML = `
      <div class="setup-page">
        <div class="setup-container animate-fadeIn">
          <div class="setup-header">
            <div class="setup-logo animate-float">
              <div class="logo-icon">${icon('server', 48)}</div>
            </div>
            <h1 class="setup-title">${t('setup.title')}</h1>
            <p class="setup-subtitle">${t('setup.subtitle')}</p>
          </div>

          <div class="setup-progress">
            <div class="progress-track">
              <div class="progress-fill" style="width: ${(step / 3) * 100}%"></div>
            </div>
            <div class="progress-steps">
              <div class="progress-step ${step >= 1 ? 'active' : ''}" data-step="1">1</div>
              <div class="progress-step ${step >= 2 ? 'active' : ''}" data-step="2">2</div>
              <div class="progress-step ${step >= 3 ? 'active' : ''}" data-step="3">3</div>
            </div>
          </div>

          <div class="setup-content">
            ${renderStep()}
          </div>
        </div>
      </div>
    `;

        bindEvents();
    }

    function renderStep() {
        switch (step) {
            case 1:
                return `
          <div class="setup-step animate-slideInUp">
            <div class="input-group">
              <label class="input-label">${t('setup.panelUrl')}</label>
              <input type="url" class="input" id="panel-url" 
                     placeholder="${t('setup.panelUrlPlaceholder')}" 
                     value="${panelUrl}">
            </div>
            <div class="input-group">
              <label class="input-label">${t('setup.apiKey')}</label>
              <input type="password" class="input" id="api-key" 
                     placeholder="${t('setup.apiKeyPlaceholder')}" 
                     value="${apiKey}">
              <small class="text-muted">${t('setup.apiKeyHelp')}</small>
            </div>
            <div class="setup-actions">
              <button class="btn btn-primary btn-lg" id="step1-next">
                ${t('setup.continue')} ${icon('chevronRight')}
              </button>
            </div>
          </div>
        `;
            case 2:
                return `
          <div class="setup-step animate-slideInUp">
            <div class="input-group">
              <label class="input-label">${t('setup.accessCode')}</label>
              <div class="pin-input-container" id="pin-container">
                <input type="password" class="pin-digit" maxlength="1" data-index="0">
                <input type="password" class="pin-digit" maxlength="1" data-index="1">
                <input type="password" class="pin-digit" maxlength="1" data-index="2">
                <input type="password" class="pin-digit" maxlength="1" data-index="3">
              </div>
              <small class="text-muted text-center">${t('setup.accessCodeHelp')}</small>
            </div>
            <div class="setup-actions">
              <button class="btn btn-secondary" id="step2-skip">
                ${t('setup.skip')}
              </button>
              <button class="btn btn-primary" id="step2-next">
                ${t('setup.continue')} ${icon('chevronRight')}
              </button>
            </div>
          </div>
        `;
            case 3:
                return `
          <div class="setup-step animate-slideInUp">
            <div class="input-group">
              <label class="input-label">${t('setup.language')}</label>
              <div class="language-selector">
                <button class="lang-btn ${selectedLocale === 'en' ? 'active' : ''}" data-lang="en">
                  🇬🇧 English
                </button>
                <button class="lang-btn ${selectedLocale === 'hu' ? 'active' : ''}" data-lang="hu">
                  🇭🇺 Magyar
                </button>
              </div>
            </div>
            <div class="input-group">
              <label class="input-label">${t('setup.theme')}</label>
              <div class="theme-selector">
                <button class="theme-btn ${selectedTheme === 'dark' ? 'active' : ''}" data-theme="dark">
                  <span class="theme-preview dark"></span>
                  ${t('themes.dark')}
                </button>
                <button class="theme-btn ${selectedTheme === 'light' ? 'active' : ''}" data-theme="light">
                  <span class="theme-preview light"></span>
                  ${t('themes.light')}
                </button>
                <button class="theme-btn ${selectedTheme === 'cyberpunk' ? 'active' : ''}" data-theme="cyberpunk">
                  <span class="theme-preview cyberpunk"></span>
                  ${t('themes.cyberpunk')}
                </button>
                <button class="theme-btn ${selectedTheme === 'ocean' ? 'active' : ''}" data-theme="ocean">
                  <span class="theme-preview ocean"></span>
                  ${t('themes.ocean')}
                </button>
                <button class="theme-btn ${selectedTheme === 'sunset' ? 'active' : ''}" data-theme="sunset">
                  <span class="theme-preview sunset"></span>
                  ${t('themes.sunset')}
                </button>
              </div>
            </div>
            <div class="setup-actions">
              <button class="btn btn-primary btn-lg" id="finish-setup">
                ${t('setup.finish')} ${icon('check')}
              </button>
            </div>
          </div>
        `;
        }
    }

    function bindEvents() {
        // Step 1
        const step1Next = container.querySelector('#step1-next');
        if (step1Next) {
            step1Next.addEventListener('click', () => {
                panelUrl = container.querySelector('#panel-url').value.trim();
                apiKey = container.querySelector('#api-key').value.trim();

                if (!panelUrl || !apiKey) {
                    toast.error(t('common.error'), 'Please fill in all fields');
                    return;
                }

                // Remove trailing slash
                panelUrl = panelUrl.replace(/\/$/, '');

                step = 2;
                render();
            });
        }

        // Step 2 - PIN input
        const pinInputs = container.querySelectorAll('.pin-digit');
        pinInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && index < pinInputs.length - 1) {
                    pinInputs[index + 1].focus();
                }
                input.classList.toggle('filled', !!value);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    pinInputs[index - 1].focus();
                }
            });
        });

        const step2Skip = container.querySelector('#step2-skip');
        if (step2Skip) {
            step2Skip.addEventListener('click', () => {
                accessCode = '';
                step = 3;
                render();
            });
        }

        const step2Next = container.querySelector('#step2-next');
        if (step2Next) {
            step2Next.addEventListener('click', () => {
                accessCode = Array.from(pinInputs).map(i => i.value).join('');
                if (accessCode.length < 4) {
                    pinInputs.forEach(i => i.classList.add('error'));
                    setTimeout(() => pinInputs.forEach(i => i.classList.remove('error')), 500);
                    return;
                }
                step = 3;
                render();
            });
        }

        // Step 3 - Language
        const langBtns = container.querySelectorAll('.lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                selectedLocale = btn.dataset.lang;
                await i18n.setLocale(selectedLocale);
                render();
            });
        });

        // Step 3 - Theme
        const themeBtns = container.querySelectorAll('.theme-btn');
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedTheme = btn.dataset.theme;
                setTheme(selectedTheme);
                render();
            });
        });

        // Finish setup
        const finishBtn = container.querySelector('#finish-setup');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                setCredentials(panelUrl, apiKey);
                if (accessCode) {
                    setAccessCode(accessCode);
                }
                toast.success(t('common.success'), 'Setup complete!');
                router.navigate('/');
            });
        }
    }

    render();
}

// Add setup-specific styles
const setupStyles = document.createElement('style');
setupStyles.textContent = `
  .setup-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    background: 
      radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15), transparent 50%),
      radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.1), transparent 50%),
      var(--bg-primary);
  }

  .setup-container {
    width: 100%;
    max-width: 480px;
    background: var(--gradient-card);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl);
    backdrop-filter: blur(var(--blur-amount));
  }

  .setup-header {
    text-align: center;
    margin-bottom: var(--space-xl);
  }

  .setup-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto var(--space-lg);
    background: var(--gradient-primary);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .setup-title {
    font-size: 1.75rem;
    margin-bottom: var(--space-xs);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .setup-subtitle {
    color: var(--text-secondary);
    margin: 0;
  }

  .setup-progress {
    margin-bottom: var(--space-xl);
  }

  .progress-track {
    height: 4px;
    background: var(--glass-bg);
    border-radius: var(--radius-full);
    margin-bottom: var(--space-md);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--gradient-primary);
    border-radius: var(--radius-full);
    transition: width var(--transition-slow);
  }

  .progress-steps {
    display: flex;
    justify-content: space-between;
    padding: 0 var(--space-lg);
  }

  .progress-step {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--glass-bg);
    border: 2px solid var(--glass-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all var(--transition-fast);
  }

  .progress-step.active {
    background: var(--gradient-primary);
    border-color: transparent;
    color: white;
  }

  .setup-step {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .setup-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .language-selector, .theme-selector {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .lang-btn, .theme-btn {
    flex: 1;
    min-width: 120px;
    padding: var(--space-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-family);
    font-size: 0.875rem;
  }

  .lang-btn:hover, .theme-btn:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }

  .lang-btn.active, .theme-btn.active {
    background: var(--gradient-primary);
    border-color: transparent;
    color: white;
  }

  .theme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    min-width: 80px;
    flex: 0;
  }

  .theme-preview {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    border: 2px solid var(--glass-border);
  }

  .theme-preview.dark { background: linear-gradient(135deg, #0a0a0a, #1a1a1a); }
  .theme-preview.light { background: linear-gradient(135deg, #fafafa, #e5e5e5); }
  .theme-preview.cyberpunk { background: linear-gradient(135deg, #ff00ff, #00ffff); }
  .theme-preview.ocean { background: linear-gradient(135deg, #0ea5e9, #22d3ee); }
  .theme-preview.sunset { background: linear-gradient(135deg, #f97316, #ec4899); }

  .text-center { text-align: center; }
`;
document.head.appendChild(setupStyles);
