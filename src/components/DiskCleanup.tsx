import { useEffect, useState } from "react";
import {
  HardDrive,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import type { CleanableItem, CleanupSummary } from "../lib/types";

type Phase = "idle" | "scanning" | "review" | "cleaning" | "done";

const riskBadge: Record<string, string> = {
  safe: "badge badge-safe",
  moderate: "badge badge-moderate",
  advanced: "badge badge-advanced",
};
const riskLabel: Record<string, string> = {
  safe: "Safe",
  moderate: "Moderate",
  advanced: "Advanced",
};

export default function DiskCleanup() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<CleanableItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CleanupSummary | null>(null);

  const scan = async () => {
    setPhase("scanning");
    try {
      const data = await api.scanDisk();
      setItems(data.items);
      const safeIds = new Set(
        data.items.filter((i) => i.risk === "safe").map((i) => i.id)
      );
      setSelected(safeIds);
      setPhase("review");
    } catch (e) {
      console.error(e);
      setPhase("idle");
    }
  };

  useEffect(() => {
    scan();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (risk: string) => {
    const ids = items.filter((i) => i.risk === risk).map((i) => i.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clean = async () => {
    setPhase("cleaning");
    const toClean = items.filter((i) => selected.has(i.id));
    try {
      const res = await api.cleanItems(
        toClean.map((i) => i.id),
        toClean.map((i) => i.path)
      );
      setResult(res);
      setPhase("done");
    } catch (e) {
      console.error(e);
      setPhase("review");
    }
  };

  const selectedBytes = items
    .filter((i) => selected.has(i.id))
    .reduce((a, b) => a + b.size_bytes, 0);

  const categories = [...new Set(items.map((i) => i.category))];

  if (phase === "idle" || phase === "scanning") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--accent-soft)",
            boxShadow: phase === "scanning" ? "var(--shadow-glow-blue)" : "none",
          }}
        >
          <Search
            size={36}
            className={phase === "scanning" ? "animate-pulse" : ""}
            style={{ color: "var(--accent)" }}
          />
        </div>
        <h2 className="text-xl font-semibold">
          {phase === "scanning" ? "Scanning your system..." : "Disk Cleanup"}
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          {phase === "scanning"
            ? "Looking for files that can be safely removed"
            : "Find and remove junk files to free up space"}
        </p>
        {phase === "idle" && (
          <button onClick={scan} className="btn btn-primary mt-2">
            Start Scan
          </button>
        )}
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full animate-fade-in">
        <div className="text-center py-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 animate-float"
            style={{ background: "var(--success-soft)", boxShadow: "var(--shadow-glow-green)" }}
          >
            <CheckCircle2 size={40} style={{ color: "var(--success)" }} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Cleanup Complete!</h2>
          <p className="text-3xl font-bold" style={{ color: "var(--success)" }}>
            {formatBytes(result.total_freed)} freed
          </p>
        </div>
        <div className="space-y-2 stagger-children">
          {result.results.map((r) => (
            <div key={r.id} className="row-item">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {r.success ? (
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                ) : (
                  <XCircle size={16} style={{ color: "var(--danger)" }} />
                )}
                <span className="truncate">{r.name}</span>
              </div>
              <span className="text-sm flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                {r.success ? formatBytes(r.bytes_freed) : r.message}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setResult(null); scan(); }}
          className="btn btn-ghost w-full"
        >
          <RefreshCw size={14} /> Scan Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HardDrive size={20} style={{ color: "var(--accent)" }} />
            Disk Cleanup
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {items.length} items found &middot; {formatBytes(selectedBytes)} selected
          </p>
        </div>
        <button
          onClick={clean}
          disabled={phase === "cleaning" || selected.size === 0}
          className="btn btn-danger btn-pill flex-shrink-0"
        >
          <Trash2 size={14} />
          {phase === "cleaning" ? "Cleaning..." : `Clean ${formatBytes(selectedBytes)}`}
        </button>
      </div>

      {/* Items by category */}
      <div className="space-y-4 stagger-children">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          return (
            <div key={cat}>
              <div className="section-header">{cat}</div>
              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <label
                    key={item.id}
                    className="row-item gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="checkbox-custom"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className={riskBadge[item.risk]}>{riskLabel[item.risk]}</span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {item.description}
                      </p>
                    </div>
                    <span
                      className="font-mono text-sm flex-shrink-0"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatBytes(item.size_bytes)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle bar */}
      <div
        className="flex gap-2 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {(["safe", "moderate", "advanced"] as const).map((risk) => (
          <button
            key={risk}
            onClick={() => selectAll(risk)}
            className={`btn btn-pill ${riskBadge[risk]}`}
            style={{ cursor: "pointer" }}
          >
            Toggle {riskLabel[risk]}
          </button>
        ))}
      </div>
    </div>
  );
}
