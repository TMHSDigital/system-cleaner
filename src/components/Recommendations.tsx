import { useEffect, useState } from "react";
import {
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { api } from "../lib/api";
import type { Recommendation, Tab } from "../lib/types";

const severityConfig = {
  high: {
    icon: AlertTriangle,
    accent: "accent-left-red",
    badge: "badge badge-high",
    label: "High Priority",
    bg: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))",
  },
  medium: {
    icon: AlertCircle,
    accent: "accent-left-yellow",
    badge: "badge badge-medium",
    label: "Medium Priority",
    bg: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))",
  },
  low: {
    icon: Info,
    accent: "accent-left-blue",
    badge: "badge badge-info",
    label: "Suggestion",
    bg: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))",
  },
};

export default function Recommendations({
  onNavigate,
}: {
  onNavigate: (tab: Tab) => void;
}) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setRecs(await api.getRecommendations());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const getAction = (rec: Recommendation) => {
    switch (rec.action_type) {
      case "navigate_disk":
        return { label: "Go to Disk Cleanup", tab: "disk" as Tab };
      case "navigate_memory":
        return { label: "Go to Memory", tab: "memory" as Tab };
      case "navigate_startup":
        return { label: "Go to Startup", tab: "startup" as Tab };
      default:
        return null;
    }
  };

  return (
    <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb size={20} style={{ color: "var(--warning)" }} />
          Recommendations
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
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-float"
            style={{ background: "var(--success-soft)", boxShadow: "var(--shadow-glow-green)" }}
          >
            <Lightbulb size={32} style={{ color: "var(--success)" }} />
          </div>
          <h3 className="text-lg font-semibold">Everything looks great!</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            No issues found with your system.
          </p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {recs.map((rec) => {
            const config = severityConfig[rec.severity];
            const Icon = config.icon;
            const action = getAction(rec);

            return (
              <div
                key={rec.id}
                className={`card ${config.accent} p-4`}
                style={{ background: config.bg }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background:
                        rec.severity === "high"
                          ? "var(--danger-soft)"
                          : rec.severity === "medium"
                            ? "var(--warning-soft)"
                            : "var(--accent-soft)",
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        color:
                          rec.severity === "high"
                            ? "var(--danger)"
                            : rec.severity === "medium"
                              ? "var(--warning)"
                              : "var(--accent)",
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm">{rec.title}</h3>
                      <span className={config.badge}>{config.label}</span>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                      {rec.description}
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      {rec.potential_savings && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Potential savings: {rec.potential_savings}
                        </span>
                      )}
                      {action && (
                        <button
                          onClick={() => onNavigate(action.tab)}
                          className="btn btn-pill flex-shrink-0"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            fontSize: 12,
                            padding: "5px 14px",
                          }}
                        >
                          {action.label} <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
