// Pterodactyl Client API

import { authStore } from '../stores/index.js';

class PterodactylAPI {
    constructor() {
        this.baseUrl = '';
        this.apiKey = '';
    }

    init() {
        const state = authStore.getState();
        this.baseUrl = state.panelUrl;
        this.apiKey = state.apiKey;
    }

    async request(endpoint, options = {}) {
        this.init();

        if (!this.baseUrl || !this.apiKey) {
            throw new Error('API not configured');
        }

        const url = `${this.baseUrl}/api/client${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.errors?.[0]?.detail || `API Error: ${response.status}`);
        }

        return response.json();
    }

    // Account
    async getAccount() {
        return this.request('/account');
    }

    // Servers
    async getServers() {
        return this.request('/');
    }

    async getServer(identifier) {
        return this.request(`/servers/${identifier}`);
    }

    async getServerResources(identifier) {
        return this.request(`/servers/${identifier}/resources`);
    }

    async getServerWebsocket(identifier) {
        return this.request(`/servers/${identifier}/websocket`);
    }

    // Power
    async sendPowerAction(identifier, action) {
        return this.request(`/servers/${identifier}/power`, {
            method: 'POST',
            body: JSON.stringify({ signal: action })
        });
    }

    async startServer(identifier) {
        return this.sendPowerAction(identifier, 'start');
    }

    async stopServer(identifier) {
        return this.sendPowerAction(identifier, 'stop');
    }

    async restartServer(identifier) {
        return this.sendPowerAction(identifier, 'restart');
    }

    async killServer(identifier) {
        return this.sendPowerAction(identifier, 'kill');
    }

    // Command
    async sendCommand(identifier, command) {
        return this.request(`/servers/${identifier}/command`, {
            method: 'POST',
            body: JSON.stringify({ command })
        });
    }

    // Files
    async listFiles(identifier, directory = '/') {
        const params = new URLSearchParams({ directory });
        return this.request(`/servers/${identifier}/files/list?${params}`);
    }

    async getFileContents(identifier, file) {
        const params = new URLSearchParams({ file });
        return this.request(`/servers/${identifier}/files/contents?${params}`);
    }

    async writeFile(identifier, file, content) {
        const params = new URLSearchParams({ file });
        // For file writes, we need to send raw content
        this.init();
        const url = `${this.baseUrl}/api/client/servers/${identifier}/files/write?${params}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'text/plain'
            },
            body: content
        });

        if (!response.ok) {
            throw new Error(`Failed to write file: ${response.status}`);
        }

        return true;
    }

    async renameFile(identifier, from, to) {
        return this.request(`/servers/${identifier}/files/rename`, {
            method: 'PUT',
            body: JSON.stringify({
                root: '/',
                files: [{ from, to }]
            })
        });
    }

    async copyFile(identifier, location) {
        return this.request(`/servers/${identifier}/files/copy`, {
            method: 'POST',
            body: JSON.stringify({ location })
        });
    }

    async deleteFiles(identifier, root, files) {
        return this.request(`/servers/${identifier}/files/delete`, {
            method: 'POST',
            body: JSON.stringify({ root, files })
        });
    }

    async createFolder(identifier, root, name) {
        return this.request(`/servers/${identifier}/files/create-folder`, {
            method: 'POST',
            body: JSON.stringify({ root, name })
        });
    }

    async compressFiles(identifier, root, files) {
        return this.request(`/servers/${identifier}/files/compress`, {
            method: 'POST',
            body: JSON.stringify({ root, files })
        });
    }

    async decompressFile(identifier, root, file) {
        return this.request(`/servers/${identifier}/files/decompress`, {
            method: 'POST',
            body: JSON.stringify({ root, file })
        });
    }

    async getUploadUrl(identifier) {
        return this.request(`/servers/${identifier}/files/upload`);
    }

    async downloadFile(identifier, file) {
        return this.request(`/servers/${identifier}/files/download?file=${encodeURIComponent(file)}`);
    }

    // Databases
    async getDatabases(identifier) {
        return this.request(`/servers/${identifier}/databases`);
    }

    async createDatabase(identifier, database, remote) {
        return this.request(`/servers/${identifier}/databases`, {
            method: 'POST',
            body: JSON.stringify({ database, remote })
        });
    }

    async rotatePassword(identifier, databaseId) {
        return this.request(`/servers/${identifier}/databases/${databaseId}/rotate-password`, {
            method: 'POST'
        });
    }

    async deleteDatabase(identifier, databaseId) {
        return this.request(`/servers/${identifier}/databases/${databaseId}`, {
            method: 'DELETE'
        });
    }

    // Backups
    async getBackups(identifier) {
        return this.request(`/servers/${identifier}/backups`);
    }

    async createBackup(identifier, name = '', ignored = '') {
        return this.request(`/servers/${identifier}/backups`, {
            method: 'POST',
            body: JSON.stringify({ name, ignored })
        });
    }

    async getBackupDownload(identifier, backupId) {
        return this.request(`/servers/${identifier}/backups/${backupId}/download`);
    }

    async deleteBackup(identifier, backupId) {
        return this.request(`/servers/${identifier}/backups/${backupId}`, {
            method: 'DELETE'
        });
    }

    async restoreBackup(identifier, backupId) {
        return this.request(`/servers/${identifier}/backups/${backupId}/restore`, {
            method: 'POST'
        });
    }

    // Schedules
    async getSchedules(identifier) {
        return this.request(`/servers/${identifier}/schedules`);
    }

    // Network
    async getAllocations(identifier) {
        return this.request(`/servers/${identifier}/network/allocations`);
    }

    // Users
    async getUsers(identifier) {
        return this.request(`/servers/${identifier}/users`);
    }

    // Startup
    async getStartup(identifier) {
        return this.request(`/servers/${identifier}/startup`);
    }

    async updateStartupVariable(identifier, key, value) {
        return this.request(`/servers/${identifier}/startup/variable`, {
            method: 'PUT',
            body: JSON.stringify({ key, value })
        });
    }
}

export const api = new PterodactylAPI();

// MCLogs API
export async function uploadToMcLogs(content) {
    const response = await fetch('https://api.mclo.gs/1/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `content=${encodeURIComponent(content)}`
    });

    if (!response.ok) {
        throw new Error('Failed to upload to MCLogs');
    }

    const data = await response.json();
    return data.url;
}

// Hangar API (PaperMC plugins)
export async function searchHangarPlugins(query, limit = 25) {
    const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        sort: '-downloads'
    });

    const response = await fetch(`https://hangar.papermc.io/api/v1/projects?${params}`);
    if (!response.ok) throw new Error('Failed to search plugins');

    return response.json();
}

export async function getHangarPluginVersions(slug) {
    const response = await fetch(`https://hangar.papermc.io/api/v1/projects/${slug}/versions`);
    if (!response.ok) throw new Error('Failed to get plugin versions');

    return response.json();
}

// Modrinth API (mods/plugins)
export async function searchModrinthProjects(query, facets = [['project_type:plugin']], limit = 25) {
    const params = new URLSearchParams({
        query,
        limit: limit.toString(),
        facets: JSON.stringify(facets)
    });

    const response = await fetch(`https://api.modrinth.com/v2/search?${params}`);
    if (!response.ok) throw new Error('Failed to search Modrinth');

    return response.json();
}

export async function getModrinthVersions(projectId) {
    const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
    if (!response.ok) throw new Error('Failed to get versions');

    return response.json();
}
