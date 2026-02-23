export interface DriveInfo {
  letter: string;
  label: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
}

export interface CleanableItem {
  id: string;
  name: string;
  description: string;
  size_bytes: number;
  path: string;
  risk: "safe" | "moderate" | "advanced";
  category: string;
}

export interface DiskScanResult {
  items: CleanableItem[];
  total_cleanable_bytes: number;
}

export interface MemoryInfo {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  memory_bytes: number;
  cpu_percent: number;
  is_zombie: boolean;
  category: string;
}

export interface VmInfo {
  name: string;
  state: string;
  memory_assigned_bytes: number;
  memory_demand_bytes: number;
  vm_type: string;
}

export interface StartupItem {
  id: string;
  name: string;
  command: string;
  source: string;
  enabled: boolean;
  impact: "High" | "Medium" | "Low";
  recommended_disable: boolean;
}

export interface CleanupResult {
  id: string;
  name: string;
  success: boolean;
  bytes_freed: number;
  message: string;
}

export interface CleanupSummary {
  results: CleanupResult[];
  total_freed: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  potential_savings: string;
  action_type: string;
  fixable: boolean;
}

export type Tab = "dashboard" | "disk" | "memory" | "startup" | "recommendations";
