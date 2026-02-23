import { invoke } from "@tauri-apps/api/core";
import type {
  DriveInfo,
  DiskScanResult,
  MemoryInfo,
  ProcessInfo,
  VmInfo,
  StartupItem,
  CleanupSummary,
  Recommendation,
} from "./types";

export const api = {
  scanDisk: () => invoke<DiskScanResult>("scan_disk"),

  getDriveInfo: () => invoke<DriveInfo[]>("get_drive_info"),

  getMemoryInfo: () => invoke<MemoryInfo>("get_memory_info"),

  getProcesses: () => invoke<ProcessInfo[]>("get_processes"),

  killProcess: (pid: number) =>
    invoke<string>("kill_process", { pid }),

  getVmInfo: () => invoke<VmInfo[]>("get_vm_info"),

  getStartupItems: () => invoke<StartupItem[]>("get_startup_items"),

  toggleStartupItem: (id: string, enable: boolean) =>
    invoke<string>("toggle_startup_item", { id, enable }),

  cleanItems: (itemIds: string[], itemPaths: string[]) =>
    invoke<CleanupSummary>("clean_items", { itemIds, itemPaths }),

  getRecommendations: () =>
    invoke<Recommendation[]>("get_recommendations"),
};
