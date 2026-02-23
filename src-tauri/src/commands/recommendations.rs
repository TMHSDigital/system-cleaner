use serde::Serialize;
use std::process::Command;
use sysinfo::System;

#[derive(Debug, Serialize)]
pub struct Recommendation {
    pub id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub potential_savings: String,
    pub action_type: String,
    pub fixable: bool,
}

fn check_ram_usage(recs: &mut Vec<Recommendation>) {
    let mut sys = System::new();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let usage_pct = (used as f64 / total as f64) * 100.0;

    if usage_pct > 85.0 {
        recs.push(Recommendation {
            id: "high_ram".into(),
            title: "Memory usage is very high".into(),
            description: format!(
                "You're using {:.0}% of your RAM. Close unused programs or check the Processes tab for memory hogs.",
                usage_pct
            ),
            severity: "high".into(),
            potential_savings: format!("{:.1} GB could be freed", (used as f64 - total as f64 * 0.5) / 1_073_741_824.0),
            action_type: "navigate_memory".into(),
            fixable: false,
        });
    }
}

fn check_startup_count(recs: &mut Vec<Recommendation>) {
    let startup_items = super::startup::get_startup_items();
    let enabled_count = startup_items.iter().filter(|i| i.enabled).count();
    let disableable = startup_items
        .iter()
        .filter(|i| i.enabled && i.recommended_disable)
        .count();

    if disableable > 2 {
        recs.push(Recommendation {
            id: "startup_bloat".into(),
            title: format!("{enabled_count} programs launch at startup"),
            description: format!(
                "{disableable} of them can be safely disabled to speed up boot time."
            ),
            severity: "medium".into(),
            potential_savings: "Faster boot time".into(),
            action_type: "navigate_startup".into(),
            fixable: false,
        });
    }
}

fn check_hyper_v_vms(recs: &mut Vec<Recommendation>) {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-VM -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' } | Select-Object Name, MemoryAssigned, MemoryStartup | ConvertTo-Json",
        ])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            let arr = if json.is_array() {
                json.as_array().unwrap().clone()
            } else if json.is_object() {
                vec![json]
            } else {
                vec![]
            };

            for vm in arr {
                let assigned = vm["MemoryAssigned"].as_u64().unwrap_or(0);
                let startup = vm["MemoryStartup"].as_u64().unwrap_or(0);
                let name = vm["Name"].as_str().unwrap_or("Unknown");

                if assigned > startup * 3 && assigned > 4_294_967_296 {
                    recs.push(Recommendation {
                        id: format!("vm_memory_{}", name.replace(' ', "_")),
                        title: format!("VM '{}' is using too much memory", name),
                        description: format!(
                            "This virtual machine started with {:.1} GB but has grown to {:.1} GB. Consider setting a memory cap.",
                            startup as f64 / 1_073_741_824.0,
                            assigned as f64 / 1_073_741_824.0,
                        ),
                        severity: "high".into(),
                        potential_savings: format!("{:.1} GB", (assigned - startup) as f64 / 1_073_741_824.0),
                        action_type: "info".into(),
                        fixable: false,
                    });
                }
            }
        }
    }
}

fn check_disk_space(recs: &mut Vec<Recommendation>) {
    let drives = super::disk::get_drive_info();
    for drive in &drives {
        let free_pct = (drive.free_bytes as f64 / drive.total_bytes as f64) * 100.0;
        if free_pct < 10.0 {
            recs.push(Recommendation {
                id: format!("low_disk_{}", drive.letter),
                title: format!("Drive {} is almost full", drive.letter),
                description: format!(
                    "Only {:.1} GB free out of {:.0} GB. Run a disk cleanup to free up space.",
                    drive.free_bytes as f64 / 1_073_741_824.0,
                    drive.total_bytes as f64 / 1_073_741_824.0,
                ),
                severity: "high".into(),
                potential_savings: "Varies".into(),
                action_type: "navigate_disk".into(),
                fixable: false,
            });
        } else if free_pct < 20.0 {
            recs.push(Recommendation {
                id: format!("low_disk_{}", drive.letter),
                title: format!("Drive {} is getting full", drive.letter),
                description: format!(
                    "{:.1} GB free out of {:.0} GB ({:.0}% used)",
                    drive.free_bytes as f64 / 1_073_741_824.0,
                    drive.total_bytes as f64 / 1_073_741_824.0,
                    100.0 - free_pct,
                ),
                severity: "medium".into(),
                potential_savings: "Varies".into(),
                action_type: "navigate_disk".into(),
                fixable: false,
            });
        }
    }
}

fn check_cleanable_items(recs: &mut Vec<Recommendation>) {
    let scan = super::disk::scan_disk();
    if scan.total_cleanable_bytes > 1_073_741_824 {
        recs.push(Recommendation {
            id: "cleanable_space".into(),
            title: "Junk files detected".into(),
            description: format!(
                "{:.1} GB of temporary files, caches, and other junk can be cleaned up.",
                scan.total_cleanable_bytes as f64 / 1_073_741_824.0,
            ),
            severity: "medium".into(),
            potential_savings: format!(
                "{:.1} GB",
                scan.total_cleanable_bytes as f64 / 1_073_741_824.0
            ),
            action_type: "navigate_disk".into(),
            fixable: false,
        });
    }
}

#[tauri::command]
pub fn get_recommendations() -> Vec<Recommendation> {
    let mut recs = Vec::new();

    check_ram_usage(&mut recs);
    check_disk_space(&mut recs);
    check_startup_count(&mut recs);
    check_hyper_v_vms(&mut recs);
    check_cleanable_items(&mut recs);

    recs.sort_by(|a, b| {
        let severity_order = |s: &str| match s {
            "high" => 0,
            "medium" => 1,
            "low" => 2,
            _ => 3,
        };
        severity_order(&a.severity).cmp(&severity_order(&b.severity))
    });

    recs
}
