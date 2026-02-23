<div align="center">

<img src="src-tauri/icons/icon.png" width="80" alt="System Health Tool">

<br>

# System Health Tool

A lightweight, open-source Windows desktop app that scans, diagnoses,<br>and cleans up system issues — built for people who aren't technical.

<br>

[![License](https://img.shields.io/badge/license-MIT-222?style=for-the-badge)](LICENSE)
&nbsp;
[![Tauri](https://img.shields.io/badge/Tauri_2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://v2.tauri.app)
&nbsp;
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=000)](https://react.dev)
&nbsp;
[![Rust](https://img.shields.io/badge/Rust-DEA584?style=for-the-badge&logo=rust&logoColor=000)](https://www.rust-lang.org)

<br>

`~2.5 MB` &nbsp;&bull;&nbsp; `No bloat` &nbsp;&bull;&nbsp; `No telemetry` &nbsp;&bull;&nbsp; `Open source`

<br>

[Download](https://github.com/TMHSDigital/system-cleaner/releases) &nbsp;&nbsp;|&nbsp;&nbsp; [Build from source](#build-from-source) &nbsp;&nbsp;|&nbsp;&nbsp; [Contributing](docs/CONTRIBUTING.md)

</div>

<br>

---

<br>

### What it does

One window. Five panels. Everything your PC needs to stay healthy.

| Panel | What you get |
|:------|:-------------|
| **Dashboard** | Real-time health score (0-100), drive space bars, RAM donut chart, one-click **Quick Clean** that only touches safe items |
| **Disk Cleanup** | Scans temp files, browser caches, crash dumps, dev caches, recycle bin — every item tagged with a color-coded risk level |
| **Memory** | Live RAM usage, runaway process detection, Hyper-V and WSL VM detection, direct process kill for non-system processes |
| **Startup** | Toggle startup programs on/off with impact ratings and "recommended to disable" flags — nothing is uninstalled, just toggled |
| **Recommendations** | Auto-generated tips like *"Your pagefile is on a full drive"* with a **Fix It** button that jumps to the right panel |

<br>

### Safety model

> [!IMPORTANT]
> Nothing is deleted without showing you exactly what will happen first.

| Risk | What it means |
|:-----|:--------------|
| **Safe** | Always fine to delete. Temp files, caches, crash dumps — regenerated automatically. Quick Clean only touches these. |
| **Moderate** | Dev caches, Windows Update files. Re-downloaded on demand. Must be manually selected. |
| **Advanced** | Reserved for future features. Will require explicit confirmation. |

Locked files are silently skipped. System processes cannot be killed. Full details in [`docs/SAFETY.md`](docs/SAFETY.md).

<br>

---

<br>

### Install

Grab the latest build from [**Releases**](https://github.com/TMHSDigital/system-cleaner/releases):

| Installer | Size |
|:----------|:-----|
| `System Cleaner_x.x.x_x64-setup.exe` (NSIS) | ~2.5 MB |
| `System Cleaner_x.x.x_x64_en-US.msi` | ~3.8 MB |

> [!NOTE]
> Admin privileges are requested on launch — required for clearing system temp files, managing services, and reading all processes.

<br>

### Build from source

Requires [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/) 1.85+, and Windows 10/11 with [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner && npm install

npm run tauri:dev        # dev mode — hot reload
npm run tauri:build      # production → src-tauri/target/release/bundle/
```

<br>

---

<br>

### Architecture

```
                        ┌─────────────────────────────────────┐
                        │            Tauri Window              │
                        │                                      │
                        │   React 19 + TypeScript + Tailwind   │
                        │   Dashboard / Disk / Memory /        │
                        │   Startup / Recommendations          │
                        │              ↕ api.ts                │
                        │ ──────────────────────────────────── │
                        │        Rust Backend (Tauri 2)        │
                        │   disk · memory · startup · cleanup  │
                        │         · recommendations            │
                        └────┬──────────┬──────────────┬───────┘
                             │          │              │
                         Win32 API   PowerShell    Registry
```

Full architecture docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

<br>

### Tech stack

| | |
|:--|:--|
| **Frontend** | React 19 &middot; TypeScript 5.9 &middot; Tailwind CSS v4 &middot; Recharts |
| **Backend** | Tauri 2 (Rust) &middot; Win32 API &middot; PowerShell &middot; Registry |
| **Build** | Vite 7 &middot; Cargo |
| **Icons** | Lucide React |

<br>

<details>
<summary><strong>Project structure</strong></summary>

<br>

```
src/
├── App.tsx                         # Sidebar nav + tab routing
├── components/
│   ├── Dashboard.tsx               # Health score, drives, RAM, Quick Clean
│   ├── DiskCleanup.tsx             # Scan → Review → Clean workflow
│   ├── MemoryPanel.tsx             # RAM chart, processes, VM detection
│   ├── StartupManager.tsx          # Toggle switches + impact ratings
│   └── Recommendations.tsx         # Auto-tips with Fix It navigation
├── lib/
│   ├── api.ts                      # Typed Tauri invoke() wrappers
│   ├── types.ts                    # Shared interfaces
│   └── format.ts                   # Byte/percent formatting
└── styles/
    └── tokens.css                  # Design tokens + component classes

src-tauri/
├── src/
│   ├── lib.rs                      # Tauri bootstrap + command registration
│   ├── main.rs                     # Windows entry point
│   └── commands/
│       ├── disk.rs                 # Drive info, temp/cache scanning
│       ├── memory.rs               # RAM stats, process list, VM detection
│       ├── startup.rs              # Registry + folder startup management
│       ├── cleanup.rs              # Safe deletion with progress tracking
│       └── recommendations.rs      # Auto-generated system tips
├── tauri.conf.json
└── Cargo.toml

docs/
├── ARCHITECTURE.md
├── SAFETY.md
└── CONTRIBUTING.md
```

</details>

<br>

---

<br>

### Contributing

PRs welcome. See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for setup, code style, and how to add new cleanup targets.

<br>

<div align="center">

[MIT License](LICENSE) &middot; [TMHSDigital](https://github.com/TMHSDigital)

</div>
