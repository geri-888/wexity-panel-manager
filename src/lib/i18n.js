// i18n - Internationalization Module

class I18n {
    constructor() {
        this.locale = 'en';
        this.translations = {};
        this.fallback = 'en';
    }

    async init() {
        const savedLocale = localStorage.getItem('wexity_locale') || 'en';
        await this.setLocale(savedLocale);
    }

    async loadTranslations(locale) {
        try {
            const response = await fetch(`/locales/${locale}.json`);
            if (!response.ok) throw new Error(`Failed to load ${locale} translations`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${locale} translations:`, error);
            return null;
        }
    }

    async setLocale(locale) {
        const translations = await this.loadTranslations(locale);
        if (translations) {
            this.locale = locale;
            this.translations = translations;
            localStorage.setItem('wexity_locale', locale);
            document.documentElement.lang = locale;
            this.emit('localeChanged', locale);
        } else if (locale !== this.fallback) {
            await this.setLocale(this.fallback);
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value === 'string') {
            return this.interpolate(value, params);
        }

        return key;
    }

    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    // Simple event emitter
    listeners = {};

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

export const i18n = new I18n();
export const t = (key, params) => i18n.t(key, params);
