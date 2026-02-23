use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct MemoryInfo {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: u64,
    pub cpu_percent: f32,
    pub is_zombie: bool,
    pub category: String,
}

#[derive(Debug, Serialize)]
pub struct VmInfo {
    pub name: String,
    pub state: String,
    pub memory_assigned_bytes: u64,
    pub memory_demand_bytes: u64,
    pub vm_type: String,
}

fn categorize_process(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("chrome")
        || lower.contains("firefox")
        || lower.contains("edge")
        || lower.contains("opera")
    {
        "Browser".into()
    } else if lower.contains("code")
        || lower.contains("cursor")
        || lower.contains("windsurf")
        || lower.contains("node")
        || lower.contains("python")
        || lower.contains("rust")
        || lower.contains("java")
        || lower.contains("dotnet")
        || lower.contains("postgres")
    {
        "Developer".into()
    } else if lower.contains("discord")
        || lower.contains("slack")
        || lower.contains("teams")
        || lower.contains("zoom")
    {
        "Communication".into()
    } else if lower.contains("steam")
        || lower.contains("epic")
        || lower.contains("battle.net")
        || lower.contains("game")
    {
        "Gaming".into()
    } else if lower.contains("svchost")
        || lower.contains("explorer")
        || lower.contains("dwm")
        || lower.contains("csrss")
        || lower.contains("system")
        || lower.contains("services")
        || lower.contains("lsass")
        || lower.contains("winlogon")
    {
        "System".into()
    } else {
        "Other".into()
    }
}

#[tauri::command]
pub fn get_memory_info() -> MemoryInfo {
    let mut sys = System::new();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let free = total.saturating_sub(used);
    let usage_percent = if total > 0 {
        (used as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    MemoryInfo {
        total_bytes: total,
        used_bytes: used,
        free_bytes: free,
        usage_percent,
    }
}

#[tauri::command]
pub fn get_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    std::thread::sleep(std::time::Duration::from_millis(500));
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .values()
        .map(|p| {
            let name = p.name().to_string_lossy().to_string();
            let mem = p.memory();
            let cpu = p.cpu_usage();

            let is_zombie = cpu > 25.0 && mem < 10_000_000;

            ProcessInfo {
                pid: p.pid().as_u32(),
                name: name.clone(),
                memory_bytes: mem,
                cpu_percent: cpu,
                is_zombie,
                category: categorize_process(&name),
            }
        })
        .filter(|p| p.memory_bytes > 1_000_000)
        .collect();

    processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
    processes.truncate(50);
    processes
}

#[tauri::command]
pub fn kill_process(pid: u32) -> Result<String, String> {
    let s = System::new();
    let pid = sysinfo::Pid::from_u32(pid);

    if let Some(process) = s.process(pid) {
        if process.kill() {
            Ok("Process terminated".into())
        } else {
            Err("Failed to terminate process — it may require admin rights".into())
        }
    } else {
        Err("Process not found — it may have already exited".into())
    }
}

#[tauri::command]
pub fn get_vm_info() -> Vec<VmInfo> {
    let mut vms = Vec::new();

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-VM -ErrorAction SilentlyContinue | Select-Object Name, State, MemoryAssigned, MemoryDemand | ConvertTo-Json",
        ])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            let arr = if json.is_array() {
                json.as_array().unwrap().clone()
            } else {
                vec![json]
            };

            for vm in arr {
                vms.push(VmInfo {
                    name: vm["Name"].as_str().unwrap_or("Unknown").into(),
                    state: format!("{}", vm["State"]),
                    memory_assigned_bytes: vm["MemoryAssigned"].as_u64().unwrap_or(0),
                    memory_demand_bytes: vm["MemoryDemand"].as_u64().unwrap_or(0),
                    vm_type: "Hyper-V".into(),
                });
            }
        }
    }

    let wsl_output = Command::new("wsl")
        .args(["--list", "--quiet"])
        .output();

    if let Ok(output) = wsl_output {
        let stdout = String::from_utf16_lossy(
            &output
                .stdout
                .chunks(2)
                .filter_map(|c| {
                    if c.len() == 2 {
                        Some(u16::from_le_bytes([c[0], c[1]]))
                    } else {
                        None
                    }
                })
                .collect::<Vec<u16>>(),
        );
        for line in stdout.lines() {
            let name = line.trim().replace('\0', "");
            if !name.is_empty() && name != "docker-desktop" && name != "docker-desktop-data" {
                vms.push(VmInfo {
                    name: name.clone(),
                    state: "WSL".into(),
                    memory_assigned_bytes: 0,
                    memory_demand_bytes: 0,
                    vm_type: "WSL".into(),
                });
            }
        }
    }

    vms
}
