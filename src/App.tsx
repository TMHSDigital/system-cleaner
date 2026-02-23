import { useState } from "react";
import {
  LayoutDashboard,
  HardDrive,
  MemoryStick,
  Power,
  Lightbulb,
  Shield,
} from "lucide-react";
import Dashboard from "./components/Dashboard";
import DiskCleanup from "./components/DiskCleanup";
import MemoryPanel from "./components/MemoryPanel";
import StartupManager from "./components/StartupManager";
import Recommendations from "./components/Recommendations";
import type { Tab } from "./lib/types";

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "disk", label: "Disk Cleanup", icon: HardDrive },
  { id: "memory", label: "Memory", icon: MemoryStick },
  { id: "startup", label: "Startup", icon: Power },
  { id: "recommendations", label: "Tips", icon: Lightbulb },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <nav
        className="w-52 flex-shrink-0 flex flex-col"
        style={{
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Accent top bar */}
        <div
          className="h-[3px] w-full flex-shrink-0"
          style={{
            background: "linear-gradient(90deg, var(--accent), #8b5cf6, var(--accent))",
          }}
        />

        {/* Brand */}
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent), #6366f1)",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              }}
            >
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight leading-tight">
                System Health
              </h1>
              <p
                className="text-[11px] leading-tight"
                style={{ color: "var(--text-muted)" }}
              >
                Keep your PC fast & clean
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all"
                style={{
                  borderRadius: "var(--radius-md)",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active
                    ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))"
                    : "transparent",
                  borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  ...(active ? {} : {}),
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon size={18} style={{ opacity: active ? 1 : 0.6 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 text-[11px] flex-shrink-0"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          System Health Tool v1.0
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {activeTab === "dashboard" && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === "disk" && <DiskCleanup />}
        {activeTab === "memory" && <MemoryPanel />}
        {activeTab === "startup" && <StartupManager />}
        {activeTab === "recommendations" && (
          <Recommendations onNavigate={setActiveTab} />
        )}
      </main>
    </div>
  );
}
