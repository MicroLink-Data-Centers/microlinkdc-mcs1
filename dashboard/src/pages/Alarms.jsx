import { useState, useMemo, useCallback } from "react";
import { api, usePolling } from "../lib/api";

// ═══════════════════════════════════════════════════════════════════════════
// MCS STREAM D — ALARM MANAGEMENT VIEW (LIVE)
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#0a0e17", card: "#111827", border: "#1e293b", text: "#e2e8f0",
  muted: "#64748b", dim: "#475569", accent: "#3b82f6",
  green: "#10b981", yellow: "#f59e0b", red: "#ef4444",
  orange: "#f97316", purple: "#8b5cf6", cyan: "#06b6d4",
};

const PRIORITY = { P0: { color: "#fff", bg: C.red, label: "CRITICAL" }, P1: { color: "#fff", bg: C.orange, label: "HIGH" }, P2: { color: "#000", bg: C.yellow, label: "MEDIUM" }, P3: { color: C.muted, bg: C.border, label: "LOW" } };
const STATES = { ACTIVE: C.red, ACKED: C.yellow, RTN_UNACK: C.cyan, SHELVED: C.purple, SUPPRESSED: C.dim, CLEARED: C.green };

const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d`;
};

const Badge = ({ children, color, bg }) => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "2px 7px", borderRadius: 4, color, backgroundColor: bg, whiteSpace: "nowrap" }}>{children}</span>
);

const FilterChip = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: 20, border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    color: active ? C.accent : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer",
  }}>{label}</button>
);

export default function AlarmManagement() {
  const [filterState, setFilterState] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [sortBy, setSortBy] = useState("priority");
  const [shelveId, setShelveId] = useState(null);
  const [shelveReason, setShelveReason] = useState("");
  const [actionError, setActionError] = useState(null);
  const [actionPending, setActionPending] = useState(null);

  // Poll alarms every 5s
  const { data: alarmData, loading, refetch } = usePolling(
    () => api.listAlarms({
      state: filterState || undefined,
      priority: filterPriority || undefined,
    }),
    5000,
    [filterState, filterPriority]
  );

  // Poll ISA-18.2 stats every 15s
  const { data: stats } = usePolling(() => api.alarmStats(), 15000);

  const alarms = alarmData?.alarms || [];

  const sorted = useMemo(() => {
    let result = [...alarms];
    if (sortBy === "priority") {
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      result.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9) || new Date(b.raised_at) - new Date(a.raised_at));
    } else if (sortBy === "time") {
      result.sort((a, b) => new Date(b.raised_at) - new Date(a.raised_at));
    } else if (sortBy === "subsystem") {
      result.sort((a, b) => (a.subsystem || "").localeCompare(b.subsystem || ""));
    }
    return result;
  }, [alarms, sortBy]);

  const handleAck = useCallback(async (alarm) => {
    setActionPending(alarm.id);
    setActionError(null);
    try {
      await api.acknowledgeAlarm(alarm.sensor_id, "operator");
      await refetch();
    } catch (err) {
      setActionError(`ACK failed: ${err.message || err.detail || "Unknown error"}`);
    } finally {
      setActionPending(null);
    }
  }, [refetch]);

  const handleShelve = useCallback(async (alarm) => {
    if (shelveReason.length < 3) return;
    setActionPending(alarm.id);
    setActionError(null);
    try {
      await api.shelveAlarm(alarm.sensor_id, "operator", shelveReason, 8);
      setShelveId(null);
      setShelveReason("");
      await refetch();
    } catch (err) {
      setActionError(`Shelve failed: ${err.message || err.detail || "Unknown error"}`);
    } finally {
      setActionPending(null);
    }
  }, [shelveReason, refetch]);

  const standing = stats?.standing ?? alarmData?.standing ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Alarm Management</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {actionError && <span style={{ fontSize: 11, color: C.red }}>{actionError}</span>}
          <span style={{ fontSize: 11, color: C.muted }}>
            {loading ? "updating..." : `${alarms.length} alarm${alarms.length !== 1 ? "s" : ""}`}
          </span>
          {stats?.compliant != null && (
            <Badge color={stats.compliant ? "#fff" : "#000"} bg={stats.compliant ? C.green : C.red}>
              ISA-18.2 {stats.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
            </Badge>
          )}
        </div>
      </div>

      {/* ISA-18.2 Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Standing", value: standing, color: standing > 0 ? C.red : C.green },
          { label: "Active", value: stats?.standing ?? 0, color: C.red },
          { label: "Acked", value: stats?.acked ?? 0, color: C.yellow },
          { label: "Shelved", value: stats?.shelved ?? 0, color: C.purple },
          { label: "Suppressed", value: stats?.suppressed ?? 0, color: C.dim },
          { label: "Raised/Hr", value: stats?.raised_last_hour ?? 0, color: (stats?.raised_last_hour ?? 0) > 6 ? C.red : C.green },
        ].map(m => (
          <div key={m.label} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.muted, marginRight: 4 }}>STATE:</span>
        <FilterChip label="All" active={!filterState} onClick={() => setFilterState(null)} />
        {Object.keys(STATES).filter(s => s !== "CLEARED").map(s => (
          <FilterChip key={s} label={s} active={filterState === s} onClick={() => setFilterState(filterState === s ? null : s)} />
        ))}
        <span style={{ fontSize: 10, color: C.muted, marginLeft: 12, marginRight: 4 }}>PRIORITY:</span>
        {["P0", "P1", "P2", "P3"].map(p => (
          <FilterChip key={p} label={p} active={filterPriority === p} onClick={() => setFilterPriority(filterPriority === p ? null : p)} />
        ))}
        <span style={{ fontSize: 10, color: C.muted, marginLeft: 12, marginRight: 4 }}>SORT:</span>
        {["priority", "time", "subsystem"].map(s => (
          <FilterChip key={s} label={s} active={sortBy === s} onClick={() => setSortBy(s)} />
        ))}
      </div>

      {/* Alarm Table */}
      <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "50px 55px 80px 140px 80px 80px 80px 60px 1fr",
          padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.muted,
          textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700,
        }}>
          <span>Pri</span><span>State</span><span>Subsystem</span><span>Tag</span>
          <span>Raised</span><span>Operator</span><span>Block</span><span>Actions</span><span>Detail</span>
        </div>

        {sorted.length === 0 && (
          <div style={{ padding: "24px 12px", textAlign: "center", color: C.dim, fontSize: 12 }}>
            {loading ? "Loading alarms..." : "No alarms match the current filters"}
          </div>
        )}

        {sorted.map(alarm => (
          <div key={alarm.id} style={{
            display: "grid", gridTemplateColumns: "50px 55px 80px 140px 80px 80px 80px 60px 1fr",
            padding: "8px 12px", borderBottom: `1px solid ${C.border}`,
            alignItems: "center",
            background: alarm.state === "ACTIVE" && (alarm.priority === "P0" || alarm.priority === "P1") ? "rgba(239,68,68,0.06)" : "transparent",
            opacity: actionPending === alarm.id ? 0.5 : 1,
          }}>
            <span><Badge color={PRIORITY[alarm.priority]?.color || C.muted} bg={PRIORITY[alarm.priority]?.bg || C.border}>{alarm.priority}</Badge></span>
            <span><Badge color={STATES[alarm.state] || C.dim} bg="transparent">{(alarm.state || "").slice(0, 4)}</Badge></span>
            <span style={{ fontSize: 10, color: C.muted }}>{alarm.subsystem}</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: C.text, fontWeight: 600 }}>{alarm.tag}</span>
            <span style={{ fontSize: 10, color: C.muted }}>{timeAgo(alarm.raised_at)}</span>
            <span style={{ fontSize: 10, color: C.muted }}>
              {alarm.acked_by || alarm.shelved_by || "—"}
            </span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>{alarm.block_id}</span>
            <span style={{ display: "flex", gap: 4 }}>
              {(alarm.state === "ACTIVE" || alarm.state === "RTN_UNACK") && (
                <button onClick={() => handleAck(alarm)} disabled={actionPending === alarm.id} style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                  border: `1px solid ${C.green}`, background: "transparent", color: C.green, cursor: "pointer",
                }}>ACK</button>
              )}
              {(alarm.state === "ACTIVE" || alarm.state === "ACKED") && (
                <button onClick={() => setShelveId(alarm.id)} disabled={actionPending === alarm.id} style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                  border: `1px solid ${C.purple}`, background: "transparent", color: C.purple, cursor: "pointer",
                }}>SHV</button>
              )}
            </span>
            <span style={{ fontSize: 10, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {alarm.shelve_reason || ""}
            </span>
          </div>
        ))}
      </div>

      {/* Shelve modal */}
      {shelveId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setShelveId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, width: 400 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Shelve Alarm</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Tag: <span style={{ color: C.text, fontFamily: "monospace" }}>{alarms.find(a => a.id === shelveId)?.tag}</span>
            </div>
            <input value={shelveReason} onChange={e => setShelveReason(e.target.value)} placeholder="Reason (required, min 3 chars)" style={{
              width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
              background: C.bg, color: C.text, fontSize: 13, marginBottom: 12, outline: "none",
            }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShelveId(null)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleShelve(alarms.find(a => a.id === shelveId))} disabled={shelveReason.length < 3} style={{
                padding: "8px 16px", borderRadius: 6, border: "none",
                background: shelveReason.length >= 3 ? C.purple : C.border,
                color: shelveReason.length >= 3 ? "#fff" : C.muted, fontWeight: 700, cursor: shelveReason.length >= 3 ? "pointer" : "not-allowed",
              }}>Shelve (8h)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
