// Modal Component
import { t } from '../lib/i18n.js';

class ModalManager {
    constructor() {
        this.activeModal = null;
    }

    show({ title, content, actions = [], closable = true, size = 'md' }) {
        this.hide();

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        if (closable) {
            backdrop.addEventListener('click', () => this.hide());
        }

        const sizeClass = size === 'lg' ? 'style="max-width: 700px;"' :
            size === 'sm' ? 'style="max-width: 400px;"' : '';

        const modal = document.createElement('div');
        modal.className = 'modal';
        if (sizeClass) modal.setAttribute('style', sizeClass.replace('style="', '').replace('"', ''));

        modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        ${closable ? `
          <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
      ${actions.length > 0 ? `
        <div class="modal-footer">
          ${actions.map((action, index) => `
            <button class="btn ${action.variant || 'btn-secondary'}" data-action="${index}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

        // If content is an element, append it
        if (typeof content !== 'string' && content instanceof Element) {
            modal.querySelector('.modal-body').appendChild(content);
        }

        // Bind close button
        if (closable) {
            modal.querySelector('.modal-close-btn')?.addEventListener('click', () => this.hide());
        }

        // Bind action buttons
        actions.forEach((action, index) => {
            const btn = modal.querySelector(`[data-action="${index}"]`);
            if (btn && action.onClick) {
                btn.addEventListener('click', () => {
                    action.onClick();
                    if (action.closeOnClick !== false) {
                        this.hide();
                    }
                });
            }
        });

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        this.activeModal = { backdrop, modal };

        // Close on escape
        this.handleEscape = (e) => {
            if (e.key === 'Escape' && closable) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.handleEscape);

        return modal;
    }

    hide() {
        if (this.activeModal) {
            this.activeModal.backdrop.remove();
            this.activeModal.modal.remove();
            this.activeModal = null;
            document.body.style.overflow = '';
            document.removeEventListener('keydown', this.handleEscape);
        }
    }

    confirm({ title, message, confirmText, cancelText, onConfirm, onCancel, danger = false }) {
        return this.show({
            title,
            content: `<p>${message}</p>`,
            actions: [
                {
                    label: cancelText || t('common.cancel'),
                    variant: 'btn-secondary',
                    onClick: onCancel || (() => { })
                },
                {
                    label: confirmText || t('common.confirm'),
                    variant: danger ? 'btn-danger' : 'btn-primary',
                    onClick: onConfirm
                }
            ]
        });
    }

    prompt({ title, message, placeholder, defaultValue = '', onSubmit }) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input';
        input.placeholder = placeholder || '';
        input.value = defaultValue;

        const content = document.createElement('div');
        if (message) {
            const p = document.createElement('p');
            p.textContent = message;
            p.style.marginBottom = 'var(--space-md)';
            content.appendChild(p);
        }
        content.appendChild(input);

        const modal = this.show({
            title,
            content,
            actions: [
                {
                    label: t('common.cancel'),
                    variant: 'btn-secondary'
                },
                {
                    label: t('common.confirm'),
                    variant: 'btn-primary',
                    onClick: () => onSubmit(input.value),
                    closeOnClick: true
                }
            ]
        });

        // Focus input
        setTimeout(() => input.focus(), 100);

        return modal;
    }
}

export const modal = new ModalManager();
