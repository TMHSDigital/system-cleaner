mod commands;

use commands::{cleanup, disk, memory, recommendations, startup};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            disk::scan_disk,
            disk::get_drive_info,
            memory::get_memory_info,
            memory::get_processes,
            memory::kill_process,
            memory::get_vm_info,
            startup::get_startup_items,
            startup::toggle_startup_item,
            cleanup::clean_items,
            recommendations::get_recommendations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
