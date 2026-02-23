use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct CleanupResult {
    pub id: String,
    pub name: String,
    pub success: bool,
    pub bytes_freed: u64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct CleanupSummary {
    pub results: Vec<CleanupResult>,
    pub total_freed: u64,
}

fn delete_dir_contents(path: &Path) -> (u64, String) {
    if !path.exists() {
        return (0, "Path not found".into());
    }

    let mut freed = 0u64;
    let mut errors = 0u32;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let size = if entry_path.is_file() {
                entry.metadata().map(|m| m.len()).unwrap_or(0)
            } else {
                dir_size_fast(&entry_path)
            };

            let result = if entry_path.is_file() {
                fs::remove_file(&entry_path)
            } else {
                fs::remove_dir_all(&entry_path)
            };

            match result {
                Ok(_) => freed += size,
                Err(_) => errors += 1,
            }
        }
    }

    let msg = if errors > 0 {
        format!("Cleaned with {errors} files skipped (in use)")
    } else {
        "Cleaned successfully".into()
    };

    (freed, msg)
}

fn dir_size_fast(path: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                total += dir_size_fast(&p);
            }
        }
    }
    total
}

fn clean_recycle_bin() -> (u64, String) {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Clear-RecycleBin -Force -ErrorAction SilentlyContinue",
        ])
        .output();

    match output {
        Ok(_) => (0, "Recycle Bin emptied".into()),
        Err(e) => (0, format!("Failed: {e}")),
    }
}

#[tauri::command]
pub fn clean_items(item_ids: Vec<String>, item_paths: Vec<String>) -> CleanupSummary {
    let mut results = Vec::new();
    let mut total_freed = 0u64;

    for (id, path) in item_ids.iter().zip(item_paths.iter()) {
        let (freed, message) = match id.as_str() {
            "recycle_bin" => clean_recycle_bin(),
            "memory_dump" => {
                let p = Path::new(path);
                let size = p.metadata().map(|m| m.len()).unwrap_or(0);
                match fs::remove_file(p) {
                    Ok(_) => (size, "Deleted".into()),
                    Err(e) => (0, format!("Failed: {e}")),
                }
            }
            "windows_update" => {
                let _ = Command::new("net")
                    .args(["stop", "wuauserv"])
                    .output();
                let result = delete_dir_contents(Path::new(path));
                let _ = Command::new("net")
                    .args(["start", "wuauserv"])
                    .output();
                result
            }
            _ => delete_dir_contents(Path::new(path)),
        };

        total_freed += freed;
        results.push(CleanupResult {
            id: id.clone(),
            name: id.replace('_', " "),
            success: freed > 0 || message.contains("emptied") || message.contains("successfully"),
            bytes_freed: freed,
            message,
        });
    }

    CleanupSummary {
        results,
        total_freed,
    }
}
