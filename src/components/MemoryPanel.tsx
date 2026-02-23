import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  MemoryStick,
  RefreshCw,
  Skull,
  XCircle,
  Server,
  ChevronDown,
} from "lucide-react";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import type { MemoryInfo, ProcessInfo, VmInfo } from "../lib/types";

const categoryColors: Record<string, string> = {
  Browser: "var(--cat-browser)",
  Developer: "var(--cat-developer)",
  Communication: "var(--cat-communication)",
  Gaming: "var(--cat-gaming)",
  System: "var(--cat-system)",
  Other: "var(--cat-other)",
};

export default function MemoryPanel() {
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [vms, setVms] = useState<VmInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, p, v] = await Promise.all([
        api.getMemoryInfo(),
        api.getProcesses(),
        api.getVmInfo(),
      ]);
      setMemory(m);
      setProcesses(p);
      setVms(v);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const killProc = async (pid: number) => {
    setKilling(pid);
    try {
      await api.killProcess(pid);
      await refresh();
    } catch (e) {
      console.error(e);
    }
    setKilling(null);
  };

  const byCategory = processes.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.memory_bytes;
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const zombies = processes.filter((p) => p.is_zombie);
  const visibleProcesses = showAll ? processes : processes.slice(0, 12);

  return (
    <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MemoryStick size={20} style={{ color: "var(--accent)" }} />
          Memory & Processes
        </h2>
        <button onClick={refresh} disabled={loading} className="btn btn-ghost btn-pill">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : (
        <div className="stagger-children">
          {/* Stats bar */}
          {memory && (
            <div className="card p-4">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Used</div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                    {formatBytes(memory.used_bytes)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Free</div>
                  <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                    {formatBytes(memory.free_bytes)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Total</div>
                  <div className="text-2xl font-bold">
                    {formatBytes(memory.total_bytes)}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="progress-track" style={{ height: 10 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${memory.usage_percent}%`,
                      height: 10,
                      background:
                        memory.usage_percent > 90
                          ? "var(--danger)"
                          : memory.usage_percent > 75
                            ? "var(--warning)"
                            : "var(--accent)",
                    }}
                  />
                </div>
                <span
                  className="absolute right-0 -top-5 text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  {memory.usage_percent.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Category chart */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2">Memory by Category</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatBytes(v)}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => formatBytes(val)}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={categoryColors[d.name] || "var(--cat-other)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Virtual Machines */}
          {vms.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Server size={15} style={{ color: "var(--accent)" }} />
                Virtual Machines
              </h3>
              <div className="space-y-1.5">
                {vms.map((vm) => (
                  <div key={vm.name} className="row-item">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">{vm.name}</span>
                      <span className="badge badge-info">{vm.vm_type}</span>
                    </div>
                    <span className="text-sm flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {vm.memory_assigned_bytes > 0
                        ? formatBytes(vm.memory_assigned_bytes)
                        : vm.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zombie processes */}
          {zombies.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: "var(--warning)" }}>
                <Skull size={15} /> Potential Problem Processes
              </h3>
              <div className="space-y-1.5">
                {zombies.map((p) => (
                  <div key={p.pid} className="row-item accent-left-yellow">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>PID {p.pid}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {formatBytes(p.memory_bytes)} &middot; {p.cpu_percent.toFixed(1)}%
                      </span>
                      <button
                        onClick={() => killProc(p.pid)}
                        disabled={killing === p.pid}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                        title="End process"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process list */}
          <div>
            <h3 className="font-semibold text-sm mb-2">
              Top Processes ({processes.length})
            </h3>
            <div className="space-y-1">
              {visibleProcesses.map((p, i) => (
                <div
                  key={p.pid}
                  className="row-item"
                  style={{
                    background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-secondary)",
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: categoryColors[p.category] || "var(--cat-other)" }}
                    />
                    <span className="font-medium text-sm truncate">{p.name}</span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {p.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono w-18 text-right" style={{ color: "var(--text-secondary)" }}>
                      {formatBytes(p.memory_bytes)}
                    </span>
                    <span className="text-xs font-mono w-14 text-right" style={{ color: "var(--text-muted)" }}>
                      {p.cpu_percent.toFixed(1)}%
                    </span>
                    <button
                      onClick={() => killProc(p.pid)}
                      disabled={killing === p.pid || p.category === "System"}
                      className="p-1 rounded-md transition-colors disabled:opacity-20"
                      style={{ color: "var(--text-muted)" }}
                      title={p.category === "System" ? "Cannot kill system process" : "End process"}
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {processes.length > 12 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="btn btn-ghost btn-pill w-full mt-3"
              >
                <ChevronDown
                  size={14}
                  style={{
                    transform: showAll ? "rotate(180deg)" : "none",
                    transition: "transform 200ms",
                  }}
                />
                {showAll ? "Show Less" : `Show All ${processes.length} Processes`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
