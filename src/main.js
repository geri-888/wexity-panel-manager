// Main entry point
import { i18n } from './lib/i18n.js';
import { router } from './lib/router.js';
import {
    authStore,
    initAuthStore,
    initSettingsStore,
    logout
} from './stores/index.js';
import { icon } from './components/ui/Icons.js';
import { t } from './lib/i18n.js';

// Pages
import { renderSetup } from './pages/Setup.js';
import { renderLogin } from './pages/Login.js';
import { renderDashboard } from './pages/Dashboard.js';
import { renderServer } from './pages/Server.js';
import { renderFiles } from './pages/Files.js';
import { renderSettings } from './pages/Settings.js';
import { renderTools } from './pages/Tools.js';

// Initialize stores
initAuthStore();
initSettingsStore();

// App container
const app = document.getElementById('app');

// Layout components
function renderLayout(content) {
    const auth = authStore.getState();

    return `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            ${icon('server', 28)}
          </div>
          <span class="sidebar-brand">Wexity Panel</span>
        </div>
        
        <nav class="sidebar-nav">
          <a href="/" class="sidebar-link ${location.pathname === '/' ? 'active' : ''}" data-link>
            ${icon('home')}
            <span>${t('nav.dashboard')}</span>
          </a>
          <a href="/tools" class="sidebar-link ${location.pathname === '/tools' ? 'active' : ''}" data-link>
            ${icon('wrench')}
            <span>${t('nav.tools')}</span>
          </a>
          <a href="/settings" class="sidebar-link ${location.pathname === '/settings' ? 'active' : ''}" data-link>
            ${icon('settings')}
            <span>${t('nav.settings')}</span>
          </a>
        </nav>
        
        <div class="sidebar-footer">
          ${auth.hasAccessCode ? `
            <button class="sidebar-link" id="logout-btn">
              ${icon('logout')}
              <span>${t('nav.logout')}</span>
            </button>
          ` : ''}
        </div>
      </aside>
      
      <main class="main-content">
        <div class="content-wrapper" id="page-content">
          ${content}
        </div>
      </main>
    </div>
  `;
}

function renderPage(pageRenderer, ...args) {
    app.innerHTML = renderLayout('');
    const pageContent = app.querySelector('#page-content');
    pageRenderer(pageContent, ...args);

    // Bind navigation links
    app.querySelectorAll('[data-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            router.navigate(link.getAttribute('href'));
        });
    });

    // Bind logout
    app.querySelector('#logout-btn')?.addEventListener('click', () => {
        logout();
        router.navigate('/login');
    });
}

function renderFullPage(pageRenderer, ...args) {
    app.innerHTML = '';
    pageRenderer(app, ...args);
}

// Route guard
router.beforeEach((to) => {
    const auth = authStore.getState();

    // Not setup yet
    if (!auth.isSetup && to.path !== '/setup') {
        return '/setup';
    }

    // Setup complete, redirect from setup
    if (auth.isSetup && to.path === '/setup') {
        return '/';
    }

    // Has access code but not authenticated
    if (auth.isSetup && auth.hasAccessCode && !auth.isAuthenticated && to.path !== '/login') {
        return '/login';
    }

    // Authenticated but trying to access login
    if (auth.isAuthenticated && to.path === '/login') {
        return '/';
    }

    return true;
});

// Define routes
router
    .addRoute('/setup', () => renderFullPage(renderSetup))
    .addRoute('/login', () => renderFullPage(renderLogin))
    .addRoute('/', () => renderPage(renderDashboard))
    .addRoute('/server/:id', (route) => renderPage(renderServer, route.params.id))
    .addRoute('/server/:id/files', (route) => renderPage(renderFiles, route.params.id))
    .addRoute('/tools', () => renderPage(renderTools))
    .addRoute('/settings', () => renderPage(renderSettings));

// Initialize
async function init() {
    // Load translations
    await i18n.init();

    // Re-render on locale change
    i18n.on('localeChanged', () => {
        router.handleRoute();
    });

    // Handle initial route
    router.handleRoute();
}

init();
