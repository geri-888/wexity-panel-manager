// Toast notification system
import { t } from '../lib/i18n.js';

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    show(type, title, message, duration = 4000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
      <div class="toast-icon">${this.getIcon(type)}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));

        this.container.appendChild(toast);
        this.toasts.push(toast);

        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }

        return toast;
    }

    hide(toast) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
            warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`
        };
        return icons[type] || icons.info;
    }

    success(title, message) {
        return this.show('success', title, message);
    }

    error(title, message) {
        return this.show('error', title, message);
    }

    warning(title, message) {
        return this.show('warning', title, message);
    }

    info(title, message) {
        return this.show('info', title, message);
    }
}

export const toast = new ToastManager();
