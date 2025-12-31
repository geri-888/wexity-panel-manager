// Store - Simple reactive state management

class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Set();
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// Auth Store
export const authStore = new Store({
    isSetup: false,
    isAuthenticated: false,
    hasAccessCode: false,
    panelUrl: '',
    apiKey: ''
});

// Initialize auth from localStorage
export function initAuthStore() {
    const panelUrl = localStorage.getItem('wexity_panel_url');
    const apiKey = localStorage.getItem('wexity_api_key');
    const accessCode = localStorage.getItem('wexity_access_code');

    authStore.setState({
        isSetup: !!(panelUrl && apiKey),
        isAuthenticated: !accessCode, // Auto-auth if no access code set
        hasAccessCode: !!accessCode,
        panelUrl: panelUrl || '',
        apiKey: apiKey || ''
    });
}

export function setCredentials(panelUrl, apiKey) {
    localStorage.setItem('wexity_panel_url', panelUrl);
    localStorage.setItem('wexity_api_key', apiKey);
    authStore.setState({
        isSetup: true,
        panelUrl,
        apiKey
    });
}

export function setAccessCode(code) {
    if (code) {
        localStorage.setItem('wexity_access_code', code);
        authStore.setState({ hasAccessCode: true, isAuthenticated: false });
    } else {
        localStorage.removeItem('wexity_access_code');
        authStore.setState({ hasAccessCode: false, isAuthenticated: true });
    }
}

export function verifyAccessCode(code) {
    const storedCode = localStorage.getItem('wexity_access_code');
    if (code === storedCode) {
        authStore.setState({ isAuthenticated: true });
        return true;
    }
    return false;
}

export function logout() {
    if (authStore.getState().hasAccessCode) {
        authStore.setState({ isAuthenticated: false });
    }
}

export function resetAll() {
    localStorage.removeItem('wexity_panel_url');
    localStorage.removeItem('wexity_api_key');
    localStorage.removeItem('wexity_access_code');
    localStorage.removeItem('wexity_theme');
    localStorage.removeItem('wexity_locale');
    authStore.setState({
        isSetup: false,
        isAuthenticated: false,
        hasAccessCode: false,
        panelUrl: '',
        apiKey: ''
    });
}

// Settings Store
export const settingsStore = new Store({
    theme: 'dark',
    locale: 'en',
    sidebarCollapsed: false
});

export function initSettingsStore() {
    const theme = localStorage.getItem('wexity_theme') || 'dark';
    const locale = localStorage.getItem('wexity_locale') || 'en';

    settingsStore.setState({ theme, locale });
    applyTheme(theme);
}

export function setTheme(theme) {
    localStorage.setItem('wexity_theme', theme);
    settingsStore.setState({ theme });
    applyTheme(theme);
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export function toggleSidebar() {
    const current = settingsStore.getState().sidebarCollapsed;
    settingsStore.setState({ sidebarCollapsed: !current });
}

// Servers Store
export const serversStore = new Store({
    servers: [],
    currentServer: null,
    loading: false,
    error: null
});
