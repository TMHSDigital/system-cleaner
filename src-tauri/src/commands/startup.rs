use serde::Serialize;
use std::env;
use std::fs;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Serialize, Clone)]
pub struct StartupItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub source: String,
    pub enabled: bool,
    pub impact: String,
    pub recommended_disable: bool,
}

fn known_safe_to_disable() -> Vec<&'static str> {
    vec![
        "discord",
        "slack",
        "teams",
        "msteams",
        "spotify",
        "steam",
        "epicgames",
        "origin",
        "ubisoft",
        "battle.net",
        "skype",
        "onedrive",
        "googledrive",
        "dropbox",
        "adobe",
        "itunes",
        "cortana",
        "docker",
        "ollama",
        "figma",
        "proton",
        "ringcentral",
        "tiktok",
        "razer",
        "corsair",
        "logitech",
    ]
}

fn estimate_impact(command: &str) -> String {
    let lower = command.to_lowercase();
    if lower.contains("steam")
        || lower.contains("docker")
        || lower.contains("onedrive")
        || lower.contains("googledrive")
        || lower.contains("adobe")
    {
        "High".into()
    } else if lower.contains("discord")
        || lower.contains("slack")
        || lower.contains("teams")
        || lower.contains("nvidia")
        || lower.contains("corsair")
        || lower.contains("razer")
    {
        "Medium".into()
    } else {
        "Low".into()
    }
}

fn scan_registry_run(hkey: &RegKey, source: &str, items: &mut Vec<StartupItem>) {
    let safe_list = known_safe_to_disable();

    if let Ok(run_key) = hkey.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") {
        for name in run_key.enum_values().flatten() {
            let (val_name, val) = name;
            let command = val.to_string();
            let lower = val_name.to_lowercase();
            let recommended = safe_list.iter().any(|s| lower.contains(s));

            items.push(StartupItem {
                id: format!("reg_{}_{}", source.replace(' ', "_"), val_name),
                name: val_name,
                command: command.clone(),
                source: source.into(),
                enabled: true,
                impact: estimate_impact(&command),
                recommended_disable: recommended,
            });
        }
    }

    if let Ok(run_key) =
        hkey.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run")
    {
        for name in run_key.enum_values().flatten() {
            let (val_name, val) = name;
            let bytes = val.bytes;
            if bytes.len() >= 4 && bytes[0] == 0x03 {
                for item in items.iter_mut() {
                    if item.name == val_name && item.source == source {
                        item.enabled = false;
                    }
                }
            }
        }
    }
}

fn scan_startup_folder(items: &mut Vec<StartupItem>) {
    let safe_list = known_safe_to_disable();

    if let Ok(appdata) = env::var("APPDATA") {
        let startup_path =
            format!("{appdata}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup");
        if let Ok(entries) = fs::read_dir(&startup_path) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let path = entry.path().to_string_lossy().to_string();
                let lower = name.to_lowercase();
                let recommended = safe_list.iter().any(|s| lower.contains(s));

                items.push(StartupItem {
                    id: format!("folder_{}", name.replace(' ', "_")),
                    name: name.replace(".lnk", "").replace(".url", ""),
                    command: path,
                    source: "Startup Folder".into(),
                    enabled: true,
                    impact: "Medium".into(),
                    recommended_disable: recommended,
                });
            }
        }
    }
}

#[tauri::command]
pub fn get_startup_items() -> Vec<StartupItem> {
    let mut items = Vec::new();

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    scan_registry_run(&hkcu, "Current User", &mut items);

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    scan_registry_run(&hklm, "All Users", &mut items);

    scan_startup_folder(&mut items);

    items
}

#[tauri::command]
pub fn toggle_startup_item(id: String, enable: bool) -> Result<String, String> {
    let parts: Vec<&str> = id.splitn(3, '_').collect();
    if parts.len() < 3 {
        return Err("Invalid item ID".into());
    }

    let source_type = parts[0];
    let item_name = parts[2..].join("_");

    match source_type {
        "reg" => {
            let scope = parts[1];
            let hkey = if scope.starts_with("Current") {
                RegKey::predef(HKEY_CURRENT_USER)
            } else {
                RegKey::predef(HKEY_LOCAL_MACHINE)
            };

            if enable {
                if let Ok(approved_key) = hkey.open_subkey_with_flags(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
                    KEY_SET_VALUE,
                ) {
                    let enabled_bytes: [u8; 12] = [0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    approved_key
                        .set_raw_value(
                            &item_name,
                            &winreg::RegValue {
                                bytes: enabled_bytes.to_vec(),
                                vtype: REG_BINARY,
                            },
                        )
                        .map_err(|e| e.to_string())?;
                }
                Ok(format!("{item_name} enabled"))
            } else {
                if let Ok(approved_key) = hkey.open_subkey_with_flags(
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
                    KEY_SET_VALUE,
                ) {
                    let disabled_bytes: [u8; 12] = [0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    approved_key
                        .set_raw_value(
                            &item_name,
                            &winreg::RegValue {
                                bytes: disabled_bytes.to_vec(),
                                vtype: REG_BINARY,
                            },
                        )
                        .map_err(|e| e.to_string())?;
                }
                Ok(format!("{item_name} disabled"))
            }
        }
        "folder" => {
            let appdata = env::var("APPDATA").map_err(|e| e.to_string())?;
            let startup_path =
                format!("{appdata}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup");
            let disabled_path =
                format!("{appdata}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\.disabled");

            if !enable {
                fs::create_dir_all(&disabled_path).map_err(|e| e.to_string())?;
                let src = format!("{startup_path}\\{item_name}");
                let dst = format!("{disabled_path}\\{item_name}");
                fs::rename(&src, &dst).map_err(|e| format!("Failed to disable: {e}"))?;
                Ok(format!("{item_name} disabled"))
            } else {
                let src = format!("{disabled_path}\\{item_name}");
                let dst = format!("{startup_path}\\{item_name}");
                fs::rename(&src, &dst).map_err(|e| format!("Failed to enable: {e}"))?;
                Ok(format!("{item_name} enabled"))
            }
        }
        _ => Err("Unknown startup item type".into()),
    }
}
