// Router - Simple client-side routing

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeHooks = [];
        this.afterHooks = [];

        window.addEventListener('popstate', () => this.handleRoute());
    }

    addRoute(path, handler) {
        this.routes.set(path, handler);
        return this;
    }

    beforeEach(hook) {
        this.beforeHooks.push(hook);
        return this;
    }

    afterEach(hook) {
        this.afterHooks.push(hook);
        return this;
    }

    navigate(path, replace = false) {
        if (replace) {
            window.history.replaceState({}, '', path);
        } else {
            window.history.pushState({}, '', path);
        }
        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const query = Object.fromEntries(new URLSearchParams(window.location.search));

        // Find matching route
        let handler = null;
        let params = {};

        for (const [routePath, routeHandler] of this.routes) {
            const match = this.matchRoute(routePath, path);
            if (match) {
                handler = routeHandler;
                params = match.params;
                break;
            }
        }

        if (!handler) {
            // Default to 404 or dashboard
            handler = this.routes.get('/') || this.routes.get('/dashboard');
        }

        const route = { path, params, query };

        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = await hook(route, this.currentRoute);
            if (result === false) return;
            if (typeof result === 'string') {
                this.navigate(result, true);
                return;
            }
        }

        const previousRoute = this.currentRoute;
        this.currentRoute = route;

        // Execute handler
        if (handler) {
            await handler(route);
        }

        // Run after hooks
        for (const hook of this.afterHooks) {
            await hook(route, previousRoute);
        }
    }

    matchRoute(routePath, actualPath) {
        const routeParts = routePath.split('/').filter(Boolean);
        const actualParts = actualPath.split('/').filter(Boolean);

        if (routeParts.length !== actualParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];

            if (routePart.startsWith(':')) {
                params[routePart.slice(1)] = actualPart;
            } else if (routePart !== actualPart) {
                return null;
            }
        }

        return { params };
    }

    getCurrentPath() {
        return window.location.pathname;
    }
}

export const router = new Router();
