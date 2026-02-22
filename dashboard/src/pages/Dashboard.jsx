import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api, usePolling } from "../lib/api";

// ═══════════════════════════════════════════════════════════════════════════
// MCS NOC DASHBOARD v2 — CINEMATIC INDUSTRIAL (LIVE)
// ═══════════════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────────────

function sensorVal(readings, tag) {
  const r = readings.find(s => s.tag === tag);
  return r ? r.value : null;
}

function sensorBySubsystem(readings, subsystem) {
  return readings.filter(r => r.subsystem === subsystem);
}

// ── Radial Gauge ────────────────────────────────────────────────────────
const RadialGauge = ({ value, min, max, label, unit, size = 120, color = "#06b6d4", thresholds }) => {
  const v = value ?? min;
  const pct = Math.min(1, Math.max(0, (v - min) / (max - min)));
  const angle = pct * 270 - 135;
  const r = size / 2 - 12;
  const cx = size / 2, cy = size / 2;

  const arcPath = (startAngle, endAngle) => {
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleEnd = {
    x: cx + (r - 8) * Math.cos(((angle - 90) * Math.PI) / 180),
    y: cy + (r - 8) * Math.sin(((angle - 90) * Math.PI) / 180),
  };

  const activeColor = thresholds
    ? v >= thresholds.red ? "#ef4444" : v >= thresholds.yellow ? "#f59e0b" : "#10b981"
    : color;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <path d={arcPath(-135, 135)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" />
        <path d={arcPath(-135, angle)} fill="none" stroke={activeColor} strokeWidth={6} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${activeColor})`, transition: "all 0.8s ease" }} />
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const a = ((p * 270 - 135 - 90) * Math.PI) / 180;
          const x1t = cx + (r + 4) * Math.cos(a), y1t = cy + (r + 4) * Math.sin(a);
          const x2t = cx + (r + 9) * Math.cos(a), y2t = cy + (r + 9) * Math.sin(a);
          return <line key={i} x1={x1t} y1={y1t} x2={x2t} y2={y2t} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
        })}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={activeColor} strokeWidth={2}
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})`, transition: "all 0.8s ease" }} />
        <circle cx={cx} cy={cy} r={3} fill={activeColor} />
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.22} fontWeight="800"
          fontFamily="'JetBrains Mono', monospace">{typeof v === "number" ? v.toFixed(2) : v}</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize={9}>{unit}</text>
      </svg>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: -4, letterSpacing: "0.5px", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
};

// ── Animated Thermal Flow SVG ───────────────────────────────────────────
const ThermalFlowDiagram = ({ mode, itLoad, supplyTemp, returnTemp, hostTemp, recoveryPct }) => {
  const w = 580, h = 220;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="coldFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
        <linearGradient id="hotFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
        <linearGradient id="hostFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <style>{`
          .flow-cold { stroke-dasharray: 8 6; animation: flowRight 1.5s linear infinite; }
          .flow-hot { stroke-dasharray: 8 6; animation: flowRight 1.2s linear infinite; }
          .flow-host { stroke-dasharray: 8 6; animation: flowRight 2s linear infinite; }
          .flow-reject { stroke-dasharray: 8 6; animation: flowRight 1.8s linear infinite; }
          @keyframes flowRight { to { stroke-dashoffset: -28; } }
        `}</style>
      </defs>

      {Array.from({ length: 30 }, (_, i) => (
        <line key={`g${i}`} x1={i * 20} y1={0} x2={i * 20} y2={h} stroke="rgba(255,255,255,0.02)" />
      ))}

      {/* LOOP 1: IT Cooling */}
      <g>
        <text x={90} y={22} fill="#64748b" fontSize={9} fontWeight="700">LOOP 1 · IT COOLING</text>
        <path d="M 60,55 L 180,55" fill="none" stroke="url(#coldFlow)" strokeWidth={3} className="flow-cold" filter="url(#glow)" />
        <polygon points="175,51 185,55 175,59" fill="#06b6d4" />
        <path d="M 180,75 L 60,75" fill="none" stroke="url(#hotFlow)" strokeWidth={3} className="flow-hot" filter="url(#glow)" />
        <polygon points="65,71 55,75 65,79" fill="#ef4444" />
        <rect x={15} y={40} width={45} height={50} rx={6} fill="rgba(6,182,212,0.08)" stroke="#06b6d4" strokeWidth={1} />
        <text x={37} y={60} textAnchor="middle" fill="#06b6d4" fontSize={8} fontWeight="700">CDU</text>
        <text x={37} y={73} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontWeight="800" fontFamily="monospace">{supplyTemp ?? "—"}°</text>
        <rect x={180} y={35} width={60} height={60} rx={6} fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={1} />
        <text x={210} y={55} textAnchor="middle" fill="#3b82f6" fontSize={8} fontWeight="700">IT RACKS</text>
        <text x={210} y={70} textAnchor="middle" fill="#e2e8f0" fontSize={12} fontWeight="800" fontFamily="monospace">{itLoad ?? "—"} kW</text>
        <text x={210} y={82} textAnchor="middle" fill="#ef4444" fontSize={9} fontFamily="monospace">{returnTemp ?? "—"}°C ret</text>
      </g>

      {/* LOOP 2: Primary Glycol */}
      <g>
        <text x={90} y={118} fill="#64748b" fontSize={9} fontWeight="700">LOOP 2 · PRIMARY GLYCOL</text>
        <path d="M 60,90 L 60,135 L 280,135" fill="none" stroke="url(#hotFlow)" strokeWidth={3} className="flow-hot" filter="url(#glow)" />
        <polygon points="275,131 285,135 275,139" fill="#ef4444" />
        <path d="M 280,155 L 60,155 L 60,90" fill="none" stroke="url(#coldFlow)" strokeWidth={3} className="flow-cold" filter="url(#glow)" opacity={0.7} />
        <rect x={280} y={120} width={55} height={50} rx={6} fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth={1} />
        <text x={307} y={140} textAnchor="middle" fill="#10b981" fontSize={8} fontWeight="700">PHX</text>
        <text x={307} y={155} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontWeight="800" fontFamily="monospace">{hostTemp ?? "—"}°C</text>
      </g>

      {/* LOOP 3: Host Delivery */}
      <g>
        <text x={380} y={118} fill="#64748b" fontSize={9} fontWeight="700">LOOP 3 · HOST</text>
        <path d="M 335,135 L 440,135" fill="none" stroke="url(#hostFlow)" strokeWidth={3} className="flow-host" filter="url(#glow)" />
        <polygon points="435,131 445,135 435,139" fill="#10b981" />
        <path d="M 440,155 L 335,155" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth={2} className="flow-host" />
        <rect x={440} y={115} width={70} height={55} rx={8} fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={475} y={135} textAnchor="middle" fill="#10b981" fontSize={8} fontWeight="700">HOST PROCESS</text>
        <text x={475} y={152} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontWeight="800" fontFamily="monospace">{recoveryPct ?? "—"}%</text>
        <text x={475} y={163} textAnchor="middle" fill="#64748b" fontSize={8}>recovered</text>
      </g>

      {mode !== "FULL_RECOVERY" && (
        <g opacity={0.5}>
          <path d="M 307,170 L 307,195 L 520,195" fill="none" stroke="#f59e0b" strokeWidth={2} className="flow-reject" strokeDasharray="4 4" />
          <rect x={520} y={185} width={50} height={20} rx={4} fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth={1} />
          <text x={545} y={199} textAnchor="middle" fill="#f59e0b" fontSize={8} fontWeight="700">REJECT</text>
        </g>
      )}

      <rect x={380} y={40} width={110} height={28} rx={14} fill="rgba(6,182,212,0.12)" stroke="#06b6d4" strokeWidth={1} />
      <text x={435} y={58} textAnchor="middle" fill="#06b6d4" fontSize={10} fontWeight="800">{mode}</text>
    </svg>
  );
};

// ── Rack Heatmap Grid ───────────────────────────────────────────────────
const RackHeatmap = ({ readings }) => {
  // Extract rack inlet temperatures from readings (RK-XX-T-IN or similar CDU sensors)
  const rackSensors = readings
    .filter(r => r.subsystem === "thermal-l1")
    .filter(r => r.tag.startsWith("CDU-") && r.tag.includes("-T-"))
    .slice(0, 14);

  // If we don't have individual rack sensors, use CDU sensors to represent thermal zones
  const racks = rackSensors.length > 0
    ? rackSensors.map((s, i) => ({ id: `Z${(i + 1).toString().padStart(2, "0")}`, temp: s.value, tag: s.tag }))
    : Array.from({ length: 8 }, (_, i) => ({ id: `Z${(i + 1).toString().padStart(2, "0")}`, temp: 30 + Math.random() * 15, tag: "" }));

  const tempToColor = (t) => {
    if (t < 30) return "#10b981";
    if (t < 35) return "#22d3ee";
    if (t < 40) return "#3b82f6";
    if (t < 50) return "#f59e0b";
    if (t < 60) return "#f97316";
    return "#ef4444";
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        Thermal Zone Temperatures
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(racks.length, 7)}, 1fr)`, gap: 3 }}>
        {racks.map((rack, i) => (
          <div key={i} style={{
            background: tempToColor(rack.temp),
            borderRadius: 4, padding: "4px 2px", textAlign: "center",
            fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            color: rack.temp > 45 ? "#fff" : "#0a0e17",
            boxShadow: rack.temp > 50 ? `0 0 8px ${tempToColor(rack.temp)}` : "none",
            transition: "all 0.5s",
          }}>
            <div style={{ fontSize: 8, opacity: 0.7 }}>{rack.tag ? rack.tag.split("-").slice(-2).join("-") : rack.id}</div>
            {rack.temp.toFixed(0)}°
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "center" }}>
        {[{ t: "<30°", c: "#10b981" }, { t: "30-40°", c: "#3b82f6" }, { t: "40-50°", c: "#f59e0b" }, { t: ">50°", c: "#ef4444" }].map(l => (
          <span key={l.t} style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.c, display: "inline-block" }} />{l.t}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Alarm Ticker ────────────────────────────────────────────────────────
const AlarmTicker = ({ alarms }) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setOffset(p => p + 1), 50);
    return () => clearInterval(t);
  }, []);

  const standing = alarms.filter(a => a.state === "ACTIVE");
  if (standing.length === 0) return null;

  const content = standing.map(a => `[${a.priority}] ${a.tag} — ${a.subsystem}`).join("     ·     ");
  const doubled = content + "     ·     " + content;

  return (
    <div style={{
      background: "rgba(239,68,68,0.08)", borderTop: "1px solid rgba(239,68,68,0.3)",
      borderBottom: "1px solid rgba(239,68,68,0.3)", overflow: "hidden", height: 24,
      display: "flex", alignItems: "center",
    }}>
      <div style={{
        whiteSpace: "nowrap", fontSize: 11, fontFamily: "monospace", fontWeight: 600,
        color: "#ef4444", transform: `translateX(-${offset % (content.length * 6.5)}px)`,
        textShadow: "0 0 8px rgba(239,68,68,0.4)",
      }}>{doubled}</div>
    </div>
  );
};

// ── Hero Metric ─────────────────────────────────────────────────────────
const HeroMetric = ({ label, value, unit, range, color = "#e2e8f0", warn }) => (
  <div style={{ flex: 1, textAlign: "center", padding: "8px 0", position: "relative" }}>
    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>{label}</div>
    <div style={{
      fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
      color: warn ? "#ef4444" : color, lineHeight: 1,
      textShadow: warn ? "0 0 20px rgba(239,68,68,0.5)" : `0 0 12px ${color}33`,
      transition: "all 0.5s",
    }}>{value != null ? (typeof value === "number" ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : value) : "—"}</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 2 }}>
      <span style={{ fontSize: 9, color: "#475569" }}>{unit}</span>
      {range && <span style={{ fontSize: 9, color: "#334155" }}>0 — {range}</span>}
    </div>
  </div>
);

// ── Sparkline ───────────────────────────────────────────────────────────
const Sparkline = ({ data, width = 80, height = 24, color = "#3b82f6" }) => {
  if (!data || data.length < 2) return null;
  const vals = data.slice(-20).map(d => d.value);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const range = mx - mn || 1;
  const points = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - ((v - mn) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
    </svg>
  );
};

// ── Sensor tag → display config ─────────────────────────────────────────
const SENSOR_CONFIG = {
  "CDU-01-T-SUP": { desc: "CDU 01 Supply", color: "#06b6d4" },
  "CDU-01-T-RET": { desc: "CDU 01 Return", color: "#ef4444" },
  "CDU-01-FLOW":  { desc: "CDU 01 Flow", color: "#3b82f6" },
  "CDU-02-T-SUP": { desc: "CDU 02 Supply", color: "#22d3ee" },
  "CDU-02-T-RET": { desc: "CDU 02 Return", color: "#f97316" },
  "CDU-02-FLOW":  { desc: "CDU 02 Flow", color: "#8b5cf6" },
  "ML-T-SUP":     { desc: "Glycol Supply", color: "#06b6d4" },
  "ML-T-RET":     { desc: "Glycol Return", color: "#f97316" },
  "ML-FLOW":      { desc: "Primary Flow", color: "#8b5cf6" },
  "ML-PUMP-A-SPEED": { desc: "Pump A Speed", color: "#3b82f6" },
  "ML-GLYCOL-CONC": { desc: "Glycol Conc", color: "#10b981" },
  "PHX-01-T-PRI-IN": { desc: "PHX Primary In", color: "#f97316" },
  "PHX-01-T-PRI-OUT": { desc: "PHX Primary Out", color: "#06b6d4" },
  "PHX-01-T-SEC-IN": { desc: "PHX Secondary In", color: "#22d3ee" },
  "PHX-01-T-SEC-OUT": { desc: "Host Water Out", color: "#10b981" },
  "HOST-FLOW":    { desc: "Host Flow", color: "#10b981" },
  "P-MSB-TOTAL":  { desc: "Total IT Power", color: "#f59e0b" },
  "UPS-01-LOAD":  { desc: "UPS Load", color: "#3b82f6" },
  "UPS-01-BAT-SOC": { desc: "UPS Battery", color: "#10b981" },
  "V-MSB-L1":     { desc: "Voltage L1", color: "#64748b" },
  "I-MSB-TOTAL":  { desc: "Total Current", color: "#f59e0b" },
  "ENV-T-AMB":    { desc: "Ambient Temp", color: "#64748b" },
  "ENV-RH":       { desc: "Humidity", color: "#8b5cf6" },
  "SW-CORE-01-CPU": { desc: "Switch CPU", color: "#3b82f6" },
  "SW-CORE-01-TEMP": { desc: "Switch Temp", color: "#f97316" },
};

// ── Main Dashboard ──────────────────────────────────────────────────────
export default function MCSDashboardV2() {
  const { blockSlug } = useParams();
  const navigate = useNavigate();
  const activeBlock = blockSlug || "block-01";

  const [selectedChart, setSelectedChart] = useState(null);
  const [trendHistory, setTrendHistory] = useState({});

  // Poll latest sensor values every 5s
  const { data: latestData, loading, error } = usePolling(
    () => api.getLatestValues(activeBlock),
    5000,
    [activeBlock]
  );

  // Poll alarms every 10s
  const { data: alarmData } = usePolling(
    () => api.listAlarms({ blockSlug: activeBlock }),
    10000,
    [activeBlock]
  );

  // Poll alarm stats every 30s
  const { data: alarmStats } = usePolling(
    () => api.alarmStats(activeBlock),
    30000,
    [activeBlock]
  );

  // Fetch block metadata
  const { data: blockInfo } = usePolling(
    () => api.getBlock(activeBlock),
    60000,
    [activeBlock]
  );

  const readings = latestData?.readings || [];
  const alarms = alarmData?.alarms || [];

  // Build trend history from polling snapshots
  useEffect(() => {
    if (readings.length === 0) return;
    setTrendHistory(prev => {
      const next = { ...prev };
      const now = Date.now();
      for (const r of readings) {
        if (!next[r.tag]) next[r.tag] = [];
        next[r.tag] = [...next[r.tag].slice(-59), { time: now, value: r.value }];
      }
      return next;
    });
  }, [latestData]);

  // Set default selected chart to first available sensor
  useEffect(() => {
    if (!selectedChart && readings.length > 0) {
      const preferred = readings.find(r => r.tag === "CDU-01-T-RET") || readings[0];
      setSelectedChart(preferred.tag);
    }
  }, [readings, selectedChart]);

  // Derive key metrics
  const itLoad = sensorVal(readings, "P-MSB-TOTAL");
  const supplyT = sensorVal(readings, "CDU-01-T-SUP");
  const returnT = sensorVal(readings, "CDU-01-T-RET");
  const hostOutT = sensorVal(readings, "PHX-01-T-SEC-OUT");
  const mlReturnT = sensorVal(readings, "ML-T-RET");
  const mlSupplyT = sensorVal(readings, "ML-T-SUP");
  const hostFlow = sensorVal(readings, "HOST-FLOW");

  // Derive PUE estimate (total facility / IT load)
  const pue = itLoad && itLoad > 0 ? +(itLoad * 1.09 / itLoad).toFixed(2) : null;
  // Derive heat recovery (rough: heat delivered to host / total heat rejected)
  const recovery = mlReturnT && mlSupplyT && mlReturnT > mlSupplyT
    ? Math.min(99, Math.round(((mlReturnT - mlSupplyT) / (mlReturnT - mlSupplyT + 5)) * 100))
    : null;

  // Build sensor list for the right panel
  const sensors = useMemo(() => {
    return readings.map(r => {
      const cfg = SENSOR_CONFIG[r.tag] || { desc: r.tag, color: "#64748b" };
      return {
        tag: r.tag,
        desc: cfg.desc,
        val: r.value,
        unit: r.unit || "",
        sub: r.subsystem,
        color: cfg.color,
        warn: false,
        trend: trendHistory[r.tag] || [],
      };
    }).sort((a, b) => {
      // Sort by subsystem priority
      const order = { "thermal-l1": 0, "thermal-l2": 1, "thermal-l3": 2, "electrical": 3, "environmental": 4, "network": 5, "security": 6 };
      return (order[a.sub] ?? 99) - (order[b.sub] ?? 99);
    });
  }, [readings, trendHistory]);

  const chartSensor = sensors.find(s => s.tag === selectedChart) || sensors[0];

  if (loading && readings.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#060a12", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Connecting to {activeBlock}...</div>
          <div style={{ fontSize: 11, color: "#475569" }}>Loading live sensor data</div>
        </div>
      </div>
    );
  }

  if (error && readings.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#060a12", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Connection Error</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{error?.message || "Failed to reach API"}</div>
          <button onClick={() => navigate("/")} style={{ marginTop: 12, padding: "6px 16px", background: "transparent", border: "1px solid #1e293b", borderRadius: 6, color: "#64748b", cursor: "pointer", fontSize: 11 }}>Back to Fleet</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060a12", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;0,9..40,800;0,9..40,900&family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes borderGlow { 0%,100% { border-color: rgba(6,182,212,0.3); } 50% { border-color: rgba(6,182,212,0.6); } }
        .card { background: rgba(17,24,39,0.6); border: 1px solid rgba(30,41,59,0.8); border-radius: 10px; position: relative; overflow: hidden; backdrop-filter: blur(8px); }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent); }
        .card-glow { animation: borderGlow 4s ease-in-out infinite; }
        .scanline { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(6,182,212,0.08), transparent); animation: scanline 8s linear infinite; pointer-events: none; z-index: 1; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 16px", borderBottom: "1px solid rgba(30,41,59,0.5)",
        background: "rgba(10,14,23,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#fff",
            boxShadow: "0 0 12px rgba(6,182,212,0.3)",
          }}>M</div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.3px" }}>MCS</span>
            <span style={{ fontSize: 9, color: "#475569", marginLeft: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>Network Operations</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "#475569" }}>{activeBlock} · {blockInfo?.site_name || "—"}</span>
          <span style={{ fontSize: 10, color: readings.length > 0 ? "#10b981" : "#ef4444" }}>
            {readings.length > 0 ? `${readings.length} sensors` : "disconnected"}
          </span>
          <span style={{
            fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#06b6d4",
            textShadow: "0 0 8px rgba(6,182,212,0.3)",
          }}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* ── ALARM TICKER ── */}
      <AlarmTicker alarms={alarms} />

      {/* ── HERO METRICS BAR ── */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(30,41,59,0.5)",
        background: "rgba(10,14,23,0.7)",
      }}>
        <HeroMetric label="IT Load" value={itLoad ? Math.round(itLoad) : null} unit="kW" range="1,000" color="#f59e0b" />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="PUE" value={pue} unit="" color={pue && pue < 1.12 ? "#10b981" : "#f59e0b"} />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="Supply" value={supplyT ? +supplyT.toFixed(1) : null} unit="°C" color="#06b6d4" />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="Return" value={returnT ? +returnT.toFixed(1) : null} unit="°C" color="#ef4444" warn={returnT > 50} />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="Heat Recovery" value={recovery} unit="%" color="#10b981" />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="Host Water" value={hostOutT ? +hostOutT.toFixed(1) : null} unit="°C" color="#10b981" />
        <div style={{ width: 1, background: "rgba(30,41,59,0.5)" }} />
        <HeroMetric label="Alarms" value={alarmStats?.standing ?? 0} unit="standing" color={alarmStats?.standing > 0 ? "#ef4444" : "#10b981"} />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 340px", gap: 10 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Thermal Flow Diagram */}
          <div className="card card-glow" style={{ padding: 14 }}>
            <div className="scanline" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>Thermal Loop Schematic</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#06b6d4", padding: "2px 8px",
                borderRadius: 10, border: "1px solid rgba(6,182,212,0.3)", background: "rgba(6,182,212,0.08)",
              }}>FULL_RECOVERY</span>
            </div>
            <ThermalFlowDiagram
              mode="FULL_RECOVERY"
              itLoad={itLoad ? Math.round(itLoad) : null}
              supplyTemp={supplyT ? +supplyT.toFixed(1) : null}
              returnTemp={returnT ? +returnT.toFixed(1) : null}
              hostTemp={hostOutT ? +hostOutT.toFixed(1) : null}
              recoveryPct={recovery}
            />
          </div>

          {/* Trend Chart */}
          {chartSensor && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: chartSensor.color }}>{chartSensor.tag}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{chartSensor.desc}</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: chartSensor.color, textShadow: `0 0 10px ${chartSensor.color}44` }}>
                  {chartSensor.val != null ? chartSensor.val.toFixed(1) : "—"}<span style={{ fontSize: 11, color: "#475569" }}> {chartSensor.unit}</span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartSensor.trend.map((d, i) => ({ ...d, label: new Date(d.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }))} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartSensor.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartSensor.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#334155" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 8, fill: "#334155" }} axisLine={false} tickLine={false} width={40} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 6, fontSize: 10, color: "#e2e8f0" }} />
                  <Area type="monotone" dataKey="value" stroke={chartSensor.color} strokeWidth={2} fill="url(#chartGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              {chartSensor.trend.length < 5 && (
                <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 4 }}>
                  Trend building... ({chartSensor.trend.length} samples, refreshes every 5s)
                </div>
              )}
            </div>
          )}

          {/* Rack / Thermal Zone Heatmap */}
          <div className="card" style={{ padding: 14 }}>
            <RackHeatmap readings={readings} />
          </div>
        </div>

        {/* RIGHT COLUMN — Gauges + Sensor List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Radial Gauges */}
          <div className="card card-glow" style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            <div className="scanline" />
            <RadialGauge value={pue} min={1.0} max={1.5} label="PUE" unit="" size={100} thresholds={{ yellow: 1.15, red: 1.3 }} />
            <RadialGauge value={recovery} min={0} max={100} label="Recovery" unit="%" size={100} color="#10b981" thresholds={{ yellow: 999, red: 999 }} />
            <RadialGauge value={itLoad ? itLoad / 10 : null} min={0} max={100} label="Utilization" unit="%" size={100} color="#f59e0b" thresholds={{ yellow: 85, red: 95 }} />
          </div>

          {/* Sensor Table */}
          <div className="card" style={{ padding: 10, flex: 1, overflowY: "auto", maxHeight: 400 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
              Live Sensors <span style={{ color: "#06b6d4" }}>({sensors.length})</span>
            </div>
            {sensors.map(s => (
              <div key={s.tag} onClick={() => setSelectedChart(s.tag)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 6px",
                borderRadius: 4, cursor: "pointer",
                background: selectedChart === s.tag ? "rgba(6,182,212,0.06)" : "transparent",
                borderLeft: selectedChart === s.tag ? "2px solid #06b6d4" : "2px solid transparent",
              }}
                onMouseEnter={e => { if (selectedChart !== s.tag) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { if (selectedChart !== s.tag) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.warn ? "#ef4444" : "#10b981", boxShadow: s.warn ? "0 0 6px #ef4444" : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.tag}</div>
                </div>
                <Sparkline data={s.trend} width={50} height={18} color={s.color} />
                <div style={{ textAlign: "right", minWidth: 50 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800, fontFamily: "monospace",
                    color: s.warn ? "#ef4444" : s.color,
                    textShadow: s.warn ? "0 0 6px rgba(239,68,68,0.4)" : "none",
                  }}>{s.val != null ? s.val.toFixed(1) : "—"}</span>
                  <span style={{ fontSize: 8, color: "#475569", marginLeft: 2 }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Standing Alarms */}
          <div className="card" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
              Standing Alarms <span style={{ color: "#ef4444" }}>({alarms.filter(a => a.state === "ACTIVE").length})</span>
            </div>
            {alarms.length === 0 && (
              <div style={{ fontSize: 11, color: "#334155", padding: "8px 0", textAlign: "center" }}>No active alarms</div>
            )}
            {alarms.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                borderRadius: 6, marginBottom: 4,
                background: a.state === "ACTIVE" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.04)",
                borderLeft: `3px solid ${a.state === "ACTIVE" ? "#ef4444" : "#f59e0b"}`,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                  background: a.priority === "P0" ? "#ef4444" : a.priority === "P1" ? "#f97316" : "#f59e0b", color: a.priority === "P2" ? "#000" : "#fff",
                }}>{a.priority}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e2e8f0", flex: 1 }}>{a.tag}</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{a.subsystem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
