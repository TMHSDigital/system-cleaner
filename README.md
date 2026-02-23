<div align="center">

# System Health Tool

**A lightweight Windows desktop app that scans, diagnoses, and cleans up system issues.**

Designed for people who aren't technical.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-blue?logo=tauri&logoColor=white)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-Backend-orange?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

`2.5 MB installer` · `No bloat` · `No telemetry` · `Open source`

---

</div>

## Features

<table>
<tr>
<td width="50%">

### Dashboard
Real-time health score (0–100), drive space bars, RAM usage donut chart, and a one-click **Quick Clean** button that only touches safe items.

</td>
<td width="50%">

### Disk Cleanup
Scans temp files, browser caches, crash dumps, dev caches, and the recycle bin. Every item has a color-coded risk label so you know exactly what's safe to delete.

</td>
</tr>
<tr>
<td width="50%">

### Memory & Processes
See what's eating your RAM, spot runaway processes, detect Hyper-V and WSL virtual machines hogging memory. Kill non-system processes directly.

</td>
<td width="50%">

### Startup Manager
Toggle startup programs on/off with impact ratings (High / Medium / Low) and "recommended to disable" badges. Nothing is uninstalled — just toggled.

</td>
</tr>
<tr>
<td colspan="2">

### Smart Recommendations
Auto-generated tips like *"Your pagefile is on a full drive"* or *"6 apps launch at startup"* — each with a **Fix It** button that navigates to the right panel.

</td>
</tr>
</table>

## Quick Start

### Download

Grab the latest installer from the [**Releases**](https://github.com/TMHSDigital/system-cleaner/releases) page:

| Format | Size | Notes |
|--------|------|-------|
| `System Cleaner_x.x.x_x64-setup.exe` | ~2.5 MB | NSIS installer (recommended) |
| `System Cleaner_x.x.x_x64_en-US.msi` | ~3.8 MB | MSI installer |

Or grab the standalone `.exe` from the release — no install required.

> [!NOTE]
> The app requests admin privileges on launch. This is needed for system-level operations like clearing Windows temp files, managing services, and reading all processes.

### Build From Source

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ · [Rust](https://rustup.rs/) 1.85+ · Windows 10/11 with [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner
npm install

# Dev mode (hot reload)
npm run tauri:dev

# Production build
npm run tauri:build
```

Build output: `src-tauri/target/release/bundle/`

## Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 · TypeScript 5.9 · Tailwind CSS v4 · Recharts |
| **Backend** | Tauri 2 (Rust) — native Win32 & registry access via `tauri::command` |
| **Bundler** | Vite 7 |
| **Icons** | Lucide React |

</div>

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Tauri Window                  │
│  ┌───────────────────────────────────────────┐  │
│  │             React Frontend                │  │
│  │  Dashboard · Disk · Memory · Startup · Tips│  │
│  │               ↕ api.ts                    │  │
│  └───────────────────┬───────────────────────┘  │
│                      │ IPC (JSON)               │
│  ┌───────────────────┴───────────────────────┐  │
│  │           Rust Backend (Tauri 2)          │  │
│  │  disk.rs · memory.rs · startup.rs         │  │
│  │  cleanup.rs · recommendations.rs          │  │
│  └───────────────────────────────────────────┘  │
└──────────┬───────────────┬───────────────┬──────┘
      Win32 API       PowerShell        Registry
```

> Full architecture docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Project Structure

```
system-cleaner/
├── src/                          # React frontend
│   ├── App.tsx                   # Sidebar nav + tab routing
│   ├── components/
│   │   ├── Dashboard.tsx         # Health score, drives, RAM, Quick Clean
│   │   ├── DiskCleanup.tsx       # Scan → Review → Clean workflow
│   │   ├── MemoryPanel.tsx       # RAM chart, processes, VM detection
│   │   ├── StartupManager.tsx    # Toggle switches + impact ratings
│   │   └── Recommendations.tsx   # Auto-tips with Fix It navigation
│   └── lib/
│       ├── api.ts                # Typed Tauri invoke() wrappers
│       ├── types.ts              # Shared interfaces
│       └── format.ts             # Byte/percent formatting
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri bootstrap + command registration
│   │   ├── main.rs               # Windows entry point
│   │   └── commands/
│   │       ├── disk.rs           # Drive info, temp/cache/browser scanning
│   │       ├── memory.rs         # RAM stats, process list, VM detection
│   │       ├── startup.rs        # Registry + folder startup management
│   │       ├── cleanup.rs        # Safe deletion with progress tracking
│   │       └── recommendations.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── docs/
│   ├── ARCHITECTURE.md           # How it works internally
│   ├── SAFETY.md                 # Risk levels & what gets deleted
│   └── CONTRIBUTING.md           # How to contribute
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Safety

> [!IMPORTANT]
> No files are ever deleted without showing you exactly what will happen first.

Every cleanable item is categorized by risk:

| Level | Color | Examples | What Happens |
|-------|-------|----------|-------------|
| **Safe** | Green | Temp files, browser caches, crash dumps | Always fine to delete — regenerated automatically |
| **Moderate** | Yellow | Dev caches (npm, pip, cargo), Windows Update files | Re-downloaded when needed |
| **Advanced** | Red | Reserved for future features | Requires explicit confirmation |

- **Quick Clean** only touches Safe items
- Moderate/Advanced items must be manually checked in the Disk Cleanup tab
- Locked files are silently skipped — no errors, no data loss
- System processes cannot be killed from the Memory tab

> Full safety details: [`docs/SAFETY.md`](docs/SAFETY.md)

## Contributing

PRs welcome. See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for setup instructions, code style, and how to add new cleanup targets or recommendations.

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner && npm install
npm run tauri:dev
```

## License

[MIT](LICENSE)
