// Login Page - Access code entry
import { t } from '../lib/i18n.js';
import { router } from '../lib/router.js';
import { verifyAccessCode, resetAll } from '../stores/index.js';
import { icon } from '../components/ui/Icons.js';
import { modal } from '../components/ui/Modal.js';
import { toast } from '../components/ui/Toast.js';

export function renderLogin(container) {
    let code = ['', '', '', ''];

    function render() {
        container.innerHTML = `
      <div class="login-page">
        <div class="login-container animate-fadeIn">
          <div class="login-header">
            <div class="login-logo animate-float">
              <div class="logo-icon">${icon('server', 48)}</div>
            </div>
            <h1 class="login-title">${t('login.title')}</h1>
            <p class="login-subtitle">${t('login.subtitle')}</p>
          </div>

          <div class="pin-input-container" id="pin-container">
            ${code.map((digit, i) => `
              <input type="password" 
                     class="pin-digit ${digit ? 'filled' : ''}" 
                     maxlength="1" 
                     data-index="${i}"
                     value="${digit}"
                     inputmode="numeric">
            `).join('')}
          </div>

          <div class="login-error hidden" id="login-error">
            ${icon('alertCircle')}
            <span>${t('login.wrongCode')}</span>
          </div>

          <div class="login-footer">
            <button class="btn btn-ghost" id="forgot-btn">
              ${t('login.forgot')}
            </button>
          </div>
        </div>
      </div>
    `;

        bindEvents();
        // Focus first input
        setTimeout(() => {
            container.querySelector('.pin-digit')?.focus();
        }, 100);
    }

    function bindEvents() {
        const pinInputs = container.querySelectorAll('.pin-digit');
        const errorEl = container.querySelector('#login-error');

        pinInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                code[index] = value;

                if (value) {
                    input.classList.add('filled');
                    if (index < pinInputs.length - 1) {
                        pinInputs[index + 1].focus();
                    }
                } else {
                    input.classList.remove('filled');
                }

                // Check if all digits entered
                if (code.every(d => d)) {
                    const fullCode = code.join('');
                    if (verifyAccessCode(fullCode)) {
                        // Success animation
                        pinInputs.forEach(i => i.classList.add('success'));
                        toast.success(t('common.success'), '');
                        setTimeout(() => router.navigate('/'), 500);
                    } else {
                        // Error animation
                        errorEl.classList.remove('hidden');
                        pinInputs.forEach(i => i.classList.add('error'));
                        setTimeout(() => {
                            pinInputs.forEach(i => {
                                i.classList.remove('error');
                                i.value = '';
                                i.classList.remove('filled');
                            });
                            code = ['', '', '', ''];
                            errorEl.classList.add('hidden');
                            pinInputs[0].focus();
                        }, 1000);
                    }
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    pinInputs[index - 1].focus();
                    code[index - 1] = '';
                }
            });

            // Allow only numbers
            input.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });

        // Forgot code
        const forgotBtn = container.querySelector('#forgot-btn');
        forgotBtn.addEventListener('click', () => {
            modal.confirm({
                title: t('login.reset'),
                message: t('settings.resetConfirm'),
                confirmText: t('login.reset'),
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

// Add login-specific styles
const loginStyles = document.createElement('style');
loginStyles.textContent = `
  .login-page {
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

  .login-container {
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  .login-header {
    margin-bottom: var(--space-2xl);
  }

  .login-logo {
    width: 90px;
    height: 90px;
    margin: 0 auto var(--space-lg);
    background: var(--gradient-primary);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: var(--shadow-glow);
  }

  .login-title {
    font-size: 1.5rem;
    margin-bottom: var(--space-xs);
  }

  .login-subtitle {
    color: var(--text-secondary);
    margin: 0;
  }

  .login-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    color: var(--accent-danger);
    margin-top: var(--space-lg);
    animation: shake 0.5s ease-in-out;
  }

  .login-footer {
    margin-top: var(--space-2xl);
  }

  .pin-digit.success {
    border-color: var(--accent-success);
    background: rgba(34, 197, 94, 0.1);
  }
`;
document.head.appendChild(loginStyles);
