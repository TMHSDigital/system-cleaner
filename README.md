<div align="center">

<br>

<img src="src-tauri/icons/icon.png" width="100" alt="System Health Tool icon">

<br>

# System Health Tool

### Keep your Windows PC fast, clean, and healthy.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2-blue?style=flat-square&logo=tauri&logoColor=white)](https://v2.tauri.app)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-Backend-orange?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

<br>

`~2.5 MB installer` &nbsp;·&nbsp; `No bloat` &nbsp;·&nbsp; `No telemetry` &nbsp;·&nbsp; `Open source`

<br>

<!-- TODO: Replace with actual screenshot once published -->
<!-- <img src="docs/assets/screenshot.png" width="720" alt="App screenshot"> -->

---

</div>

<br>

## Overview

A lightweight, open-source Windows desktop app that scans, diagnoses, and cleans up system issues — designed for people who aren't technical. Built with **React** on the frontend and **Rust** on the backend via [Tauri 2](https://v2.tauri.app), it's fast, tiny, and runs natively with no Electron bloat.

<br>

## Features

<table>
<tr>
<td width="50%" valign="top">

#### &nbsp;&nbsp;📊&nbsp;&nbsp;Dashboard
Real-time health score (0–100), drive space bars, RAM usage donut chart, and a one-click **Quick Clean** button that only touches safe items.

</td>
<td width="50%" valign="top">

#### &nbsp;&nbsp;🧹&nbsp;&nbsp;Disk Cleanup
Scans temp files, browser caches, crash dumps, dev caches, and the recycle bin. Every item has a color-coded risk label so you know exactly what's safe to delete.

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### &nbsp;&nbsp;🧠&nbsp;&nbsp;Memory & Processes
See what's eating your RAM, spot runaway processes, detect Hyper-V and WSL virtual machines hogging memory. Kill non-system processes directly.

</td>
<td width="50%" valign="top">

#### &nbsp;&nbsp;⚡&nbsp;&nbsp;Startup Manager
Toggle startup programs on/off with impact ratings (High / Medium / Low) and "recommended to disable" badges. Nothing is uninstalled — just toggled.

</td>
</tr>
<tr>
<td colspan="2" valign="top">

#### &nbsp;&nbsp;💡&nbsp;&nbsp;Smart Recommendations
Auto-generated tips like *"Your pagefile is on a full drive"* or *"6 apps launch at startup"* — each with a **Fix It** button that navigates directly to the right panel.

</td>
</tr>
</table>

<br>

## Quick Start

### Download

Grab the latest installer from [**Releases**](https://github.com/TMHSDigital/system-cleaner/releases):

| Format | Size | Notes |
|--------|------|-------|
| `System Cleaner_x.x.x_x64-setup.exe` | ~2.5 MB | NSIS installer (recommended) |
| `System Cleaner_x.x.x_x64_en-US.msi` | ~3.8 MB | MSI installer |

> [!NOTE]
> The app requests admin privileges on launch — needed for clearing Windows temp files, managing services, and reading all processes.

### Build from source

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ &nbsp;·&nbsp; [Rust](https://rustup.rs/) 1.85+ &nbsp;·&nbsp; Windows 10/11 with [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner
npm install

npm run tauri:dev      # dev mode with hot reload
npm run tauri:build    # production build → src-tauri/target/release/bundle/
```

<br>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 · TypeScript 5.9 · Tailwind CSS v4 · Recharts |
| **Backend** | Tauri 2 (Rust) — native Win32 & registry access via `tauri::command` |
| **Bundler** | Vite 7 |
| **Icons** | Lucide React |

<br>

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Tauri Window                                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  React Frontend                                │  │
│  │  Dashboard · Disk · Memory · Startup · Tips    │  │
│  │                  ↕ api.ts                      │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │ IPC (JSON)                   │
│  ┌────────────────────┴───────────────────────────┐  │
│  │  Rust Backend (Tauri 2)                        │  │
│  │  disk.rs · memory.rs · startup.rs              │  │
│  │  cleanup.rs · recommendations.rs               │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└─────────┬────────────────┬────────────────┬──────────┘
      Win32 API        PowerShell        Registry
```

> Full architecture docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

<br>

## Safety

> [!IMPORTANT]
> No files are ever deleted without showing you exactly what will happen first.

Every cleanable item is categorized by risk:

| Level | Meaning | Examples |
|-------|---------|----------|
| 🟢 **Safe** | Always fine to delete — regenerated automatically | Temp files, browser caches, crash dumps |
| 🟡 **Moderate** | Re-downloaded when needed | Dev caches (npm, pip, cargo), Windows Update files |
| 🔴 **Advanced** | Requires explicit confirmation | Reserved for future features |

- **Quick Clean** only touches Safe items
- Moderate / Advanced items must be manually selected in the Disk Cleanup tab
- Locked files are silently skipped — no errors, no data loss
- System processes cannot be killed from the Memory tab

> Full safety details: [`docs/SAFETY.md`](docs/SAFETY.md)

<br>

## Project Structure

```
system-cleaner/
├── src/                              # React frontend
│   ├── App.tsx                       # Sidebar nav + tab routing
│   ├── components/
│   │   ├── Dashboard.tsx             # Health score, drives, RAM, Quick Clean
│   │   ├── DiskCleanup.tsx           # Scan → Review → Clean workflow
│   │   ├── MemoryPanel.tsx           # RAM chart, processes, VM detection
│   │   ├── StartupManager.tsx        # Toggle switches + impact ratings
│   │   └── Recommendations.tsx       # Auto-tips with Fix It navigation
│   ├── lib/
│   │   ├── api.ts                    # Typed Tauri invoke() wrappers
│   │   ├── types.ts                  # Shared interfaces
│   │   └── format.ts                 # Byte/percent formatting
│   └── styles/
│       └── tokens.css                # Design tokens + component classes
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── lib.rs                    # Tauri bootstrap + command registration
│   │   ├── main.rs                   # Windows entry point
│   │   └── commands/
│   │       ├── disk.rs               # Drive info, temp/cache scanning
│   │       ├── memory.rs             # RAM stats, process list, VM detection
│   │       ├── startup.rs            # Registry + folder startup management
│   │       ├── cleanup.rs            # Safe deletion with progress tracking
│   │       └── recommendations.rs    # Auto-generated system tips
│   ├── tauri.conf.json
│   └── Cargo.toml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SAFETY.md
│   └── CONTRIBUTING.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

<br>

## Contributing

PRs welcome. See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for setup instructions, code style, and how to add new cleanup targets or recommendations.

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner && npm install
npm run tauri:dev
```

<br>

<div align="center">

## License

[MIT](LICENSE) · Built by [TMHSDigital](https://github.com/TMHSDigital)

</div>
