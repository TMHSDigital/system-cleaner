use serde::Serialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
pub struct DriveInfo {
    pub letter: String,
    pub label: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct CleanableItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
    pub path: String,
    pub risk: String, // "safe", "moderate", "advanced"
    pub category: String,
}

#[derive(Debug, Serialize)]
pub struct DiskScanResult {
    pub items: Vec<CleanableItem>,
    pub total_cleanable_bytes: u64,
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                total += dir_size(&p);
            }
        }
    }
    total
}

fn home_dir() -> PathBuf {
    PathBuf::from(env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into()))
}

fn scan_temp_files() -> Vec<CleanableItem> {
    let mut items = Vec::new();

    if let Ok(temp) = env::var("TEMP") {
        let size = dir_size(Path::new(&temp));
        if size > 0 {
            items.push(CleanableItem {
                id: "user_temp".into(),
                name: "Temporary Files".into(),
                description: "Files created by apps that are no longer needed".into(),
                size_bytes: size,
                path: temp,
                risk: "safe".into(),
                category: "System".into(),
            });
        }
    }

    let win_temp = Path::new("C:\\Windows\\Temp");
    let size = dir_size(win_temp);
    if size > 0 {
        items.push(CleanableItem {
            id: "windows_temp".into(),
            name: "Windows Temporary Files".into(),
            description: "System temporary files that can be safely removed".into(),
            size_bytes: size,
            path: win_temp.to_string_lossy().into(),
            risk: "safe".into(),
            category: "System".into(),
        });
    }

    items
}

fn scan_browser_caches() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let local = env::var("LOCALAPPDATA").unwrap_or_default();

    let browsers: Vec<(&str, &str, Vec<String>)> = vec![
        (
            "chrome_cache",
            "Google Chrome Cache",
            vec![
                format!("{local}\\Google\\Chrome\\User Data\\Default\\Cache"),
                format!("{local}\\Google\\Chrome\\User Data\\Default\\Code Cache"),
                format!("{local}\\Google\\Chrome\\User Data\\Default\\GPUCache"),
            ],
        ),
        (
            "edge_cache",
            "Microsoft Edge Cache",
            vec![
                format!("{local}\\Microsoft\\Edge\\User Data\\Default\\Cache"),
                format!("{local}\\Microsoft\\Edge\\User Data\\Default\\Code Cache"),
            ],
        ),
        (
            "firefox_cache",
            "Mozilla Firefox Cache",
            vec![format!(
                "{local}\\Mozilla\\Firefox\\Profiles"
            )],
        ),
    ];

    for (id, name, paths) in &browsers {
        let mut total = 0u64;
        let mut found_path = String::new();
        for p in paths {
            let path = Path::new(p);
            if path.exists() {
                total += dir_size(path);
                if found_path.is_empty() {
                    found_path = p.clone();
                }
            }
        }
        if total > 0 {
            items.push(CleanableItem {
                id: (*id).into(),
                name: (*name).into(),
                description: "Cached web pages and files — clearing won't affect your bookmarks or passwords".into(),
                size_bytes: total,
                path: found_path,
                risk: "safe".into(),
                category: "Browsers".into(),
            });
        }
    }

    items
}

fn scan_crash_dumps() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let local = env::var("LOCALAPPDATA").unwrap_or_default();
    let dumps_path = format!("{local}\\CrashDumps");
    let size = dir_size(Path::new(&dumps_path));
    if size > 0 {
        items.push(CleanableItem {
            id: "crash_dumps".into(),
            name: "Crash Reports".into(),
            description: "Error reports from crashed programs — safe to remove".into(),
            size_bytes: size,
            path: dumps_path,
            risk: "safe".into(),
            category: "System".into(),
        });
    }

    let mem_dump = Path::new("C:\\Windows\\MEMORY.DMP");
    if mem_dump.exists() {
        let size = mem_dump.metadata().map(|m| m.len()).unwrap_or(0);
        if size > 0 {
            items.push(CleanableItem {
                id: "memory_dump".into(),
                name: "System Crash Dump".into(),
                description: "Large crash dump file from a system crash".into(),
                size_bytes: size,
                path: mem_dump.to_string_lossy().into(),
                risk: "safe".into(),
                category: "System".into(),
            });
        }
    }

    items
}

fn scan_windows_update() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let wu_path = Path::new("C:\\Windows\\SoftwareDistribution\\Download");
    let size = dir_size(wu_path);
    if size > 1_000_000 {
        items.push(CleanableItem {
            id: "windows_update".into(),
            name: "Windows Update Downloads".into(),
            description: "Old update files that were already installed".into(),
            size_bytes: size,
            path: wu_path.to_string_lossy().into(),
            risk: "moderate".into(),
            category: "System".into(),
        });
    }
    items
}

fn scan_recycle_bin() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let rb_path = Path::new("C:\\$Recycle.Bin");
    let size = dir_size(rb_path);
    if size > 0 {
        items.push(CleanableItem {
            id: "recycle_bin".into(),
            name: "Recycle Bin".into(),
            description: "Deleted files still taking up space".into(),
            size_bytes: size,
            path: rb_path.to_string_lossy().into(),
            risk: "safe".into(),
            category: "System".into(),
        });
    }
    items
}

fn scan_thumbnail_cache() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let local = env::var("LOCALAPPDATA").unwrap_or_default();
    let thumb_path = format!("{local}\\Microsoft\\Windows\\Explorer");
    let path = Path::new(&thumb_path);
    if path.exists() {
        let mut size = 0u64;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("thumbcache_") || name == "iconcache_" {
                    size += entry.metadata().map(|m| m.len()).unwrap_or(0);
                }
            }
        }
        if size > 0 {
            items.push(CleanableItem {
                id: "thumbnail_cache".into(),
                name: "Thumbnail Cache".into(),
                description: "Preview images for your files — will be recreated as needed".into(),
                size_bytes: size,
                path: thumb_path,
                risk: "safe".into(),
                category: "System".into(),
            });
        }
    }
    items
}

fn scan_dev_caches() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let home = home_dir();
    let local = env::var("LOCALAPPDATA").unwrap_or_default();

    let caches: Vec<(&str, &str, &str, PathBuf)> = vec![
        (
            "npm_cache",
            "npm Cache",
            "Node.js package manager cache",
            PathBuf::from(format!("{local}\\npm-cache")),
        ),
        (
            "pip_cache",
            "pip Cache",
            "Python package manager cache",
            PathBuf::from(format!("{local}\\pip\\Cache")),
        ),
        (
            "cargo_cache",
            "Cargo Cache",
            "Rust package manager cache",
            home.join(".cargo").join("registry"),
        ),
        (
            "nuget_cache",
            "NuGet Cache",
            ".NET package manager cache",
            home.join(".nuget"),
        ),
        (
            "go_cache",
            "Go Module Cache",
            "Go language module cache",
            home.join("go"),
        ),
    ];

    for (id, name, desc, path) in caches {
        if path.exists() {
            let size = dir_size(&path);
            if size > 10_000_000 {
                items.push(CleanableItem {
                    id: id.into(),
                    name: name.into(),
                    description: format!("{desc} — packages will be re-downloaded when needed"),
                    size_bytes: size,
                    path: path.to_string_lossy().into(),
                    risk: "moderate".into(),
                    category: "Developer".into(),
                });
            }
        }
    }

    items
}

fn scan_log_files() -> Vec<CleanableItem> {
    let mut items = Vec::new();
    let local = env::var("LOCALAPPDATA").unwrap_or_default();

    let log_dirs = vec![
        Path::new("C:\\Windows\\Logs").to_path_buf(),
        PathBuf::from(format!("{local}\\Temp")),
    ];

    let mut total_log_size = 0u64;
    for dir in &log_dirs {
        if dir.exists() {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.ends_with(".log") || name.ends_with(".etl") {
                        total_log_size += entry.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                }
            }
        }
    }

    if total_log_size > 1_000_000 {
        items.push(CleanableItem {
            id: "log_files".into(),
            name: "Old Log Files".into(),
            description: "System and application log files".into(),
            size_bytes: total_log_size,
            path: "Various locations".into(),
            risk: "moderate".into(),
            category: "System".into(),
        });
    }

    items
}

#[tauri::command]
pub fn scan_disk() -> DiskScanResult {
    let mut items = Vec::new();

    items.extend(scan_temp_files());
    items.extend(scan_recycle_bin());
    items.extend(scan_browser_caches());
    items.extend(scan_crash_dumps());
    items.extend(scan_windows_update());
    items.extend(scan_thumbnail_cache());
    items.extend(scan_dev_caches());
    items.extend(scan_log_files());

    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    let total_cleanable_bytes: u64 = items.iter().map(|i| i.size_bytes).sum();

    DiskScanResult {
        items,
        total_cleanable_bytes,
    }
}

#[tauri::command]
pub fn get_drive_info() -> Vec<DriveInfo> {
    let mut drives = Vec::new();

    for letter in b'A'..=b'Z' {
        let root = format!("{}:\\", letter as char);
        let path = Path::new(&root);
        if path.exists() {
            if let Ok(space) = fs2_free_space(&root) {
                drives.push(DriveInfo {
                    letter: format!("{}:", letter as char),
                    label: get_volume_label(&root),
                    total_bytes: space.0,
                    free_bytes: space.1,
                    used_bytes: space.0.saturating_sub(space.1),
                });
            }
        }
    }

    drives
}

fn fs2_free_space(root: &str) -> Result<(u64, u64), String> {
    use windows::core::PCSTR;
    use windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExA;

    let root_c = std::ffi::CString::new(root).map_err(|e| e.to_string())?;
    let mut free_bytes_available = 0u64;
    let mut total_bytes = 0u64;
    let mut _total_free = 0u64;

    unsafe {
        GetDiskFreeSpaceExA(
            PCSTR(root_c.as_ptr() as *const u8),
            Some(&mut free_bytes_available),
            Some(&mut total_bytes),
            Some(&mut _total_free),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok((total_bytes, free_bytes_available))
}

fn get_volume_label(root: &str) -> String {
    use windows::core::PCSTR;
    use windows::Win32::Storage::FileSystem::GetVolumeInformationA;

    let root_c = match std::ffi::CString::new(root) {
        Ok(c) => c,
        Err(_) => return "Local Disk".into(),
    };
    let mut name_buf = [0u8; 260];

    unsafe {
        let result = GetVolumeInformationA(
            PCSTR(root_c.as_ptr() as *const u8),
            Some(&mut name_buf),
            None,
            None,
            None,
            None,
        );
        if result.is_ok() {
            let label = String::from_utf8_lossy(
                &name_buf[..name_buf.iter().position(|&b| b == 0).unwrap_or(0)],
            )
            .to_string();
            if label.is_empty() {
                "Local Disk".into()
            } else {
                label
            }
        } else {
            "Local Disk".into()
        }
    }
}
