import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  HardDrive,
  MemoryStick,
  Zap,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { formatBytes, formatPercent } from "../lib/format";
import type { DriveInfo, MemoryInfo, DiskScanResult, Tab } from "../lib/types";

function HealthGauge({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--danger)";
  const glowColor =
    score >= 70
      ? "rgba(34,197,94,0.3)"
      : score >= 40
        ? "rgba(245,158,11,0.3)"
        : "rgba(239,68,68,0.3)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" className="absolute">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={glowColor} />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          filter="url(#gaugeGlow)"
          style={{
            animation: "gaugeStroke 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Health Score</div>
      </div>
    </div>
  );
}

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (tab: Tab) => void;
}) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [scan, setScan] = useState<DiskScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [d, m, s] = await Promise.all([
        api.getDriveInfo(),
        api.getMemoryInfo(),
        api.scanDisk(),
      ]);
      setDrives(d);
      setMemory(m);
      setScan(s);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const healthScore = (() => {
    if (!memory || drives.length === 0) return 0;
    let score = 100;
    if (memory.usage_percent > 90) score -= 40;
    else if (memory.usage_percent > 75) score -= 20;
    else if (memory.usage_percent > 60) score -= 10;

    for (const d of drives) {
      const freePct = (d.free_bytes / d.total_bytes) * 100;
      if (freePct < 5) score -= 30;
      else if (freePct < 15) score -= 15;
      else if (freePct < 25) score -= 5;
    }

    if (scan && scan.total_cleanable_bytes > 5 * 1024 ** 3) score -= 10;
    return Math.max(0, Math.min(100, score));
  })();

  const quickClean = async () => {
    if (!scan) return;
    setCleaning(true);
    const safeItems = scan.items.filter((i) => i.risk === "safe");
    try {
      await api.cleanItems(
        safeItems.map((i) => i.id),
        safeItems.map((i) => i.path)
      );
      await refresh();
    } catch (e) {
      console.error(e);
    }
    setCleaning(false);
  };

  const ramData = memory
    ? [
        { name: "Used", value: memory.used_bytes },
        { name: "Free", value: memory.free_bytes },
      ]
    : [];

  const safeBytes = scan
    ? scan.items.filter((i) => i.risk === "safe").reduce((a, b) => a + b.size_bytes, 0)
    : 0;

  return (
    <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">System Health</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn btn-ghost btn-pill"
        >
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
          {/* Top Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Health Score */}
            <div className="card-interactive p-4 flex flex-col items-center justify-center">
              <HealthGauge score={healthScore} />
            </div>

            {/* Memory */}
            <div
              className="card-interactive p-4"
              onClick={() => onNavigate("memory")}
            >
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick size={18} style={{ color: "var(--accent)" }} />
                <span className="font-semibold text-sm">Memory</span>
              </div>
              <div style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ramData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      dataKey="value"
                      strokeWidth={0}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="var(--accent)" />
                      <Cell fill="var(--bg-surface)" />
                    </Pie>
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {memory && (
                <div className="text-center text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  {formatBytes(memory.used_bytes)} / {formatBytes(memory.total_bytes)}
                  <span style={{ color: "var(--text-muted)" }}> ({formatPercent(memory.usage_percent)})</span>
                </div>
              )}
            </div>

            {/* Quick Clean */}
            <div
              className="card p-4 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.05))",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} style={{ color: "var(--warning)" }} />
                <span className="font-semibold text-sm">Quick Clean</span>
              </div>
              {scan && (
                <>
                  <div className="text-2xl font-bold mb-1">
                    {formatBytes(safeBytes)}
                  </div>
                  <div className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>
                    can be safely cleaned
                  </div>
                  <button
                    onClick={quickClean}
                    disabled={cleaning}
                    className="btn btn-primary w-full"
                  >
                    {cleaning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      "Clean Now"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Storage Drives */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={18} style={{ color: "var(--accent)" }} />
              <h2 className="text-base font-semibold">Storage Drives</h2>
            </div>
            <div className="space-y-2">
              {drives.map((d) => {
                const usedPct = (d.used_bytes / d.total_bytes) * 100;
                const barColor =
                  usedPct > 90
                    ? "var(--danger)"
                    : usedPct > 75
                      ? "var(--warning)"
                      : "var(--accent)";
                return (
                  <div
                    key={d.letter}
                    className="card-interactive p-3"
                    onClick={() => onNavigate("disk")}
                  >
                    <div className="flex justify-between mb-2.5">
                      <span className="font-medium text-sm">
                        {d.label} ({d.letter})
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          {usedPct.toFixed(0)}%
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatBytes(d.free_bytes)} free of {formatBytes(d.total_bytes)}
                        </span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${usedPct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
