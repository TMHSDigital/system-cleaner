import { useEffect, useState } from "react";
import { Power, RefreshCw, Star, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import type { StartupItem } from "../lib/types";

export default function StartupManager() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await api.getStartupItems());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggle = async (item: StartupItem) => {
    setToggling(item.id);
    try {
      await api.toggleStartupItem(item.id, !item.enabled);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, enabled: !i.enabled } : i
        )
      );
    } catch (e) {
      console.error(e);
    }
    setToggling(null);
  };

  const enabledCount = items.filter((i) => i.enabled).length;
  const recommended = items.filter((i) => i.enabled && i.recommended_disable);

  const impactBadge: Record<string, string> = {
    High: "badge badge-high",
    Medium: "badge badge-medium",
    Low: "badge badge-low",
  };

  return (
    <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Power size={20} style={{ color: "var(--accent)" }} />
            Startup Programs
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {enabledCount} of {items.length} programs launch at startup
          </p>
        </div>
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
          {/* Warning banner */}
          {recommended.length > 0 && (
            <div
              className="card p-4 accent-left-yellow"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                <span className="font-semibold text-sm" style={{ color: "var(--warning)" }}>
                  {recommended.length} program{recommended.length > 1 ? "s" : ""} can be safely disabled
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                These programs aren't needed at startup. Disabling them will speed up your boot time.
                You can always re-enable them.
              </p>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="row-item gap-4"
                style={{
                  borderLeft: item.recommended_disable && item.enabled
                    ? "3px solid var(--warning)"
                    : undefined,
                }}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggle(item)}
                  disabled={toggling === item.id}
                  className="toggle-track"
                  data-enabled={item.enabled}
                  style={{ opacity: toggling === item.id ? 0.5 : 1 }}
                >
                  <div className="toggle-thumb" />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium text-sm"
                      style={{ color: item.enabled ? "var(--text-primary)" : "var(--text-muted)" }}
                    >
                      {item.name}
                    </span>
                    {item.recommended_disable && item.enabled && (
                      <span className="badge badge-moderate">
                        <Star size={9} /> Recommended to disable
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {item.source} &middot; {item.command.slice(0, 80)}
                    {item.command.length > 80 ? "..." : ""}
                  </p>
                </div>

                {/* Impact badge */}
                <span className={impactBadge[item.impact] || "badge badge-low"}>
                  {item.impact} impact
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
