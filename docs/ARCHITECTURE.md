# Architecture

## Overview

System Health Tool is a Tauri 2 desktop app: a Rust backend handles all system-level operations, and a React frontend provides the UI. They communicate via Tauri's `invoke()` IPC mechanism.

```
┌─────────────────────────────────────────────────┐
│                   Tauri Window                  │
│  ┌───────────────────────────────────────────┐  │
│  │             React Frontend                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │Dashboard│ │DiskClean │ │MemoryPanel│  │  │
│  │  └────┬────┘ └────┬─────┘ └─────┬─────┘  │  │
│  │       │           │             │         │  │
│  │  ┌────┴───────────┴─────────────┴──────┐  │  │
│  │  │         api.ts (invoke wrappers)    │  │  │
│  │  └────────────────┬────────────────────┘  │  │
│  └───────────────────┼───────────────────────┘  │
│                      │ IPC (JSON serialization) │
│  ┌───────────────────┼───────────────────────┐  │
│  │           Rust Backend (Tauri)             │  │
│  │  ┌────────┐ ┌────────┐ ┌──────────────┐  │  │
│  │  │disk.rs │ │memory  │ │startup.rs    │  │  │
│  │  │        │ │  .rs   │ │              │  │  │
│  │  └────────┘ └────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌─────────────────────┐    │  │
│  │  │cleanup.rs│ │recommendations.rs   │    │  │
│  │  └──────────┘ └─────────────────────┘    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │              │              │
    Win32 API      PowerShell      Registry
   (disk space,    (VM info,      (startup
    processes)      services)      items)
```

## Backend Commands

Each Rust module exposes `#[tauri::command]` functions that the frontend calls via `invoke()`.

### disk.rs

| Command | Returns | Description |
|---|---|---|
| `scan_disk()` | `DiskScanResult` | Scans all known cleanable locations, returns items with sizes and risk levels |
| `get_drive_info()` | `Vec<DriveInfo>` | Enumerates all drives (A-Z) and returns total/free/used bytes via Win32 `GetDiskFreeSpaceExA` |

**Scan locations:** User temp, Windows temp, Recycle Bin, Chrome/Edge/Firefox cache, crash dumps, Windows Update downloads, thumbnail cache, npm/pip/cargo/nuget/go caches, log files.

Each item gets a risk classification:
- `safe` — Always fine to delete (temp files, browser cache, crash dumps)
- `moderate` — Will be re-downloaded when needed (dev caches, WU downloads)
- `advanced` — Requires user judgment

### memory.rs

| Command | Returns | Description |
|---|---|---|
| `get_memory_info()` | `MemoryInfo` | Total/used/free RAM via `sysinfo` crate |
| `get_processes()` | `Vec<ProcessInfo>` | Top 50 processes by RAM, with category labels and zombie detection |
| `kill_process(pid)` | `Result<String>` | Terminates a process by PID |
| `get_vm_info()` | `Vec<VmInfo>` | Detects Hyper-V VMs (via PowerShell `Get-VM`) and WSL distros (via `wsl --list`) |

**Zombie detection:** A process is flagged as a potential zombie if it uses >25% CPU but less than 10 MB RAM (indicating a busy-loop with no real work).

**Process categories:** Browser, Developer, Communication, Gaming, System, Other — determined by name matching.

### startup.rs

| Command | Returns | Description |
|---|---|---|
| `get_startup_items()` | `Vec<StartupItem>` | Reads from `HKCU\...\Run`, `HKLM\...\Run`, and the user's Startup folder |
| `toggle_startup_item(id, enable)` | `Result<String>` | Enables/disables via `StartupApproved\Run` registry key or moving shortcut files |

**Impact estimation:** Based on known high-impact apps (Steam, Docker, OneDrive = High), medium-impact (Discord, NVIDIA, Corsair = Medium), everything else = Low.

**Recommended to disable:** Matches against a curated list of apps that are safe to not auto-start (Discord, Slack, Steam, Docker, Ollama, Figma, etc.).

### cleanup.rs

| Command | Returns | Description |
|---|---|---|
| `clean_items(item_ids, item_paths)` | `CleanupSummary` | Deletes selected items, returns per-item success/failure and total bytes freed |

Special handling:
- **Recycle Bin** — Uses PowerShell `Clear-RecycleBin`
- **Windows Update** — Stops `wuauserv` service before deleting, restarts after
- **Memory dump** — Single file deletion
- **Everything else** — Recursive directory content deletion, skipping locked files

### recommendations.rs

| Command | Returns | Description |
|---|---|---|
| `get_recommendations()` | `Vec<Recommendation>` | Analyzes current state and generates prioritized tips |

**Checks performed:**
1. RAM usage > 85% → "Memory usage is very high"
2. Any drive < 10% free → "Drive X is almost full"
3. > 2 disableable startup items → "N programs launch at startup"
4. Hyper-V VM memory > 3x startup and > 4 GB → "VM is using too much memory"
5. > 1 GB cleanable junk → "Junk files detected"

## Frontend Components

### Dashboard.tsx
Entry point. Loads drives, memory, and scan data in parallel. Shows health score (0-100) computed from RAM usage, disk free space, and junk file accumulation. Quick Clean button triggers safe-only cleanup.

### DiskCleanup.tsx
Three-phase workflow: Scan → Review → Clean → Done. Items grouped by category (System, Browsers, Developer) with risk-colored badges. Checkboxes default to safe items selected.

### MemoryPanel.tsx
RAM bar with color thresholds (green < 60%, yellow < 90%, red > 90%). Horizontal bar chart of memory by category. Process table with kill buttons (disabled for System category). VM detection section.

### StartupManager.tsx
Toggle switches styled as iOS-like sliders. Warning banner when multiple items are recommended to disable. Impact badges (High/Medium/Low) with color coding.

### Recommendations.tsx
Cards with severity-based styling (red border = high, yellow = medium, blue = low). Each card has a navigation button that jumps to the relevant tab.

## Data Flow

1. User opens app → Dashboard loads `getDriveInfo()`, `getMemoryInfo()`, `scanDisk()` in parallel
2. Health score computed client-side from the combined data
3. Quick Clean → filters scan results to `risk === "safe"` → calls `cleanItems()` → refreshes Dashboard
4. Disk Cleanup tab → auto-scans on mount → user checks/unchecks items → Clean button → `cleanItems()` → shows results
5. Memory tab → `getProcesses()` with 500ms delay between two `refresh_processes()` calls for accurate CPU measurement
6. Startup tab → `getStartupItems()` → toggle calls `toggleStartupItem()` → optimistic UI update
7. Recommendations → `getRecommendations()` which internally calls `scanDisk()`, `getStartupItems()`, checks VMs and drives
