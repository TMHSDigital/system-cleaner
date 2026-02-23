# Safety & Risk Levels

This document explains what the app can delete, how items are categorized, and what safeguards are in place.

## Core Principles

1. **Nothing is deleted without your review.** Every action shows exactly what will happen before it happens.
2. **Safe items are pre-selected.** Moderate and Advanced items require you to explicitly opt in.
3. **Quick Clean only touches Safe items.** The one-click button on the Dashboard will never delete anything risky.
4. **Locked files are skipped.** If Windows or another program is using a file, it's silently skipped — no errors, no data loss.

## Risk Categories

### Safe (Green)

These items are always fine to delete. They're regenerated automatically or serve no ongoing purpose.

| Item | What It Is | Why It's Safe |
|---|---|---|
| **Temporary Files** | Files in `%TEMP%` and `C:\Windows\Temp` | Created by apps for short-term use, not needed after |
| **Recycle Bin** | Files you already deleted | You already chose to delete these |
| **Browser Caches** | Chrome, Edge, Firefox cached pages | Speeds up revisiting sites but is rebuilt automatically. Bookmarks, passwords, and history are NOT touched |
| **Crash Reports** | Files in `%LOCALAPPDATA%\CrashDumps` | Old error reports from crashed programs |
| **System Crash Dump** | `C:\Windows\MEMORY.DMP` | Large file from a blue screen crash, only useful for debugging |
| **Thumbnail Cache** | `thumbcache_*.db` files in Explorer folder | Preview images for your files, rebuilt when you open a folder |

### Moderate (Yellow)

These items will be re-downloaded or regenerated when needed. Deleting them is safe but may cause a brief delay next time the associated tool runs.

| Item | What It Is | Impact of Deleting |
|---|---|---|
| **npm Cache** | Node.js package downloads | Packages re-download on next `npm install` (seconds to minutes) |
| **pip Cache** | Python package downloads | Packages re-download on next `pip install` |
| **Cargo Cache** | Rust crate downloads | Crates re-download on next `cargo build` |
| **NuGet Cache** | .NET package downloads | Packages re-download on next `dotnet restore` |
| **Go Module Cache** | Go dependency downloads | Modules re-download on next `go build` |
| **Windows Update Downloads** | Already-installed update files | No impact — these updates are already applied |
| **Old Log Files** | `.log` and `.etl` files in system directories | Only useful for past debugging |

### Advanced (Red)

Currently, the app does not include any Advanced-risk items. This category is reserved for future features like:
- Windows component store cleanup (DISM)
- Volume shadow copy management
- Large file discovery and deletion

These would require additional confirmation dialogs and clear warnings.

## What Is Never Touched

The app will **never** delete or modify:

- Your personal files (Documents, Photos, Videos, Music, Desktop)
- Browser bookmarks, passwords, history, or extensions
- Installed programs
- Windows system files required for operation
- Registry entries (except startup enable/disable toggles)
- Game saves or application settings

## Startup Manager Safety

The Startup Manager does not uninstall anything. It only toggles whether a program auto-launches when you sign in.

- **Disabling** a startup item sets the `StartupApproved\Run` registry value to `0x03` (disabled) or moves the shortcut to a `.disabled` subfolder.
- **Enabling** it reverses the change.
- The program itself remains fully installed and can be launched manually at any time.

## Process Killing Safety

The Memory tab lets you terminate processes. Safeguards:

- **System processes** (svchost, explorer, dwm, csrss, lsass, winlogon, services) have the kill button disabled — you cannot accidentally kill them.
- Killing a non-system process is equivalent to using Task Manager's "End Task."
- If a process cannot be terminated (e.g., it requires higher privileges), the app reports the error without crashing.

## Error Handling

- If a file or folder cannot be deleted (locked by another process), it's skipped and counted as a "skipped" item in the results.
- The cleanup summary shows both successful and skipped items.
- No operation will cause a system crash or blue screen.
