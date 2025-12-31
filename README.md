# Wexity Panel Manager

Modern Pterodactyl Client API (PTLC) web panel with Hungarian/English support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🎨 **Modern UI** - Gradient cards, glassmorphism, beautiful animations
- 🌙 **Multiple Themes** - Dark, Light, Cyberpunk, Ocean, Sunset
- 🌍 **Multi-language** - Hungarian & English
- 📁 **File Manager** - Edit files with syntax highlighting, version control
- 🎮 **Minecraft Tools** - MCLogs upload, plugin downloader
- 🔐 **Secure** - Access code protection, API key stored locally

## Quick Start

```bash
# Clone the repository
git clone https://github.com/geri-888/wexity-panel-manager.git
cd wexity-panel-manager

# Install dependencies
npm install

# Start development server
npm run dev
```

## First Time Setup

1. Open the panel in your browser
2. Enter your Pterodactyl Panel URL
3. Add your Client API key (from Account → API Credentials)
4. Optionally set an access code
5. Choose your language and theme

## Built-in Tools

### MCLogs Integration
Upload console logs to [mclo.gs](https://mclo.gs) with one click.

### Plugin Downloader
Search and download plugins directly from Hangar/Modrinth.

### File Versioning
Automatically saves file versions locally. Restore any previous version with animated diff viewer.

## Tech Stack

- **Build**: Vite
- **Terminal**: XTerm.js
- **Editor**: Monaco Editor
- **Storage**: localStorage + IndexedDB

## License

MIT License - Feel free to use, modify, and distribute.

## Contributing

Pull requests are welcome! For major changes, please open an issue first.
