# Contributing

## Getting Started

### Prerequisites

- **Node.js** 18+ — [nodejs.org](https://nodejs.org/)
- **Rust** 1.85+ — [rustup.rs](https://rustup.rs/)
- **Windows 10/11** with WebView2 runtime (comes with Windows 11, install from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) on Windows 10)

### Setup

```bash
git clone https://github.com/TMHSDigital/system-cleaner.git
cd system-cleaner
npm install
```

### Development

```bash
# Start the app in dev mode with hot reload
npm run tauri:dev
```

This starts both:
- Vite dev server on `http://localhost:5173` (frontend)
- Rust backend compiled in debug mode

Changes to React files hot-reload instantly. Changes to Rust files trigger a recompile (~5-10 seconds).

### Production Build

```bash
npm run tauri:build
```

Output:
- `src-tauri/target/release/system-cleaner.exe` — standalone binary
- `src-tauri/target/release/bundle/nsis/` — NSIS installer
- `src-tauri/target/release/bundle/msi/` — MSI installer

## Project Layout

```
src/                    # React frontend (TypeScript)
src-tauri/src/          # Rust backend
src-tauri/src/commands/ # Each file = one feature module
docs/                   # Documentation
```

## Adding a New Cleanup Target

1. **Backend:** Add a scan function in `src-tauri/src/commands/disk.rs`:

```rust
fn scan_my_new_target() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let path = Path::new("C:\\path\\to\\target");
    let size = dir_size(path);
    if size > 0 {
        items.push(CleanableItem {
            id: "my_target".into(),
            name: "Friendly Name".into(),
            description: "What this is in plain English".into(),
            size_bytes: size,
            path: path.to_string_lossy().into(),
            risk: "safe".into(),  // or "moderate" or "advanced"
            category: "System".into(),
        });
    }
    items
}
```

2. Call it from `scan_disk()`:

```rust
items.extend(scan_my_new_target());
```

3. If the cleanup needs special handling (like stopping a service first), add a case in `cleanup.rs`:

```rust
"my_target" => {
    // custom logic here
    delete_dir_contents(Path::new(path))
}
```

No frontend changes needed — new items automatically appear in the Disk Cleanup tab.

## Adding a New Recommendation

Add a check function in `src-tauri/src/commands/recommendations.rs`:

```rust
fn check_my_condition(recs: &mut Vec<Recommendation>) {
    // gather data...
    if condition_is_met {
        recs.push(Recommendation {
            id: "my_check".into(),
            title: "User-friendly title".into(),
            description: "What to do about it".into(),
            severity: "medium".into(),
            potential_savings: "How much it helps".into(),
            action_type: "navigate_disk".into(),  // or "navigate_memory", "navigate_startup", "info"
            fixable: false,
        });
    }
}
```

Then call it from `get_recommendations()`.

## Code Style

- **Rust:** Standard `rustfmt` formatting. Run `cargo fmt` before committing.
- **TypeScript:** Prettier defaults. The project doesn't enforce lint rules currently.
- **Comments:** Only add comments for non-obvious logic. Don't narrate what code does.
- **User-facing text:** Use plain English. No jargon. Think "would my mom understand this?"

## Testing

Currently the project doesn't have automated tests. When contributing:

- Test on a real Windows machine (VM is fine)
- Verify the scan finds the expected items
- Verify cleanup actually frees space (check before/after drive free space)
- Test with both admin and non-admin contexts
- Verify startup toggle actually changes the startup behavior (reboot to confirm)
