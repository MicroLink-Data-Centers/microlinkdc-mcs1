import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import KPICard from '../components/KPICard';

/* ── Inline Network Topology SVG (extracted from connectivity.html) ── */
function NetworkTopologySVG() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Network Topology Map
        </h3>
        <span className="text-[9px] text-gray-400 font-mono">1.2ms &middot; 60 Hudson St</span>
      </div>
      <div style={{ maxHeight: 300 }} className="flex-1 min-h-0">
        <svg viewBox="0 0 740 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#e8f0ff"/>
            </radialGradient>
            <filter id="node-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#1a6fff" floodOpacity="0.15"/>
            </filter>
            <marker id="arr-blue" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="#1a6fff" opacity="0.6"/>
            </marker>
            <marker id="arr-teal" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="#00b4d8" opacity="0.7"/>
            </marker>
            <marker id="arr-green" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="#10b981" opacity="0.6"/>
            </marker>
            <pattern id="bg-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="#dce8f8" opacity="0.6"/>
            </pattern>
            <style>{`
              .flow-line { stroke-dasharray: 10, 5; animation: topoFlow 2s linear infinite; }
              .flow-line-slow { stroke-dasharray: 7, 7; animation: topoFlow 3.5s linear infinite; }
              @keyframes topoFlow { to { stroke-dashoffset: -30; } }
              .node-pulse { animation: nodePulse 2.5s ease-in-out infinite; }
              @keyframes nodePulse { 0%, 100% { r: 27; opacity: 1; } 50% { r: 30; opacity: 0.7; } }
            `}</style>
          </defs>

          {/* Background */}
          <rect width="740" height="280" fill="#f8faff" rx="8"/>
          <rect width="740" height="280" fill="url(#bg-dots)" rx="8"/>

          {/* Manhattan skyline silhouette — scaled */}
          <g opacity="0.05">
            <rect x="0" y="230" width="740" height="50" fill="#1a6fff"/>
            <rect x="40" y="215" width="20" height="15" fill="#1a6fff"/>
            <rect x="80" y="205" width="15" height="25" fill="#1a6fff"/>
            <rect x="120" y="200" width="12" height="30" fill="#1a6fff"/>
            <rect x="180" y="195" width="10" height="35" fill="#1a6fff"/>
            <rect x="250" y="205" width="18" height="25" fill="#1a6fff"/>
            <rect x="340" y="200" width="14" height="30" fill="#1a6fff"/>
            <rect x="420" y="208" width="16" height="22" fill="#1a6fff"/>
            <rect x="500" y="198" width="12" height="32" fill="#1a6fff"/>
            <rect x="560" y="205" width="20" height="25" fill="#1a6fff"/>
            <rect x="630" y="210" width="18" height="20" fill="#1a6fff"/>
            <rect x="690" y="205" width="15" height="25" fill="#1a6fff"/>
          </g>

          {/* Connection Lines — carriers to MicroLink */}
          <line x1="90" y1="70" x2="250" y2="132" stroke="#1a6fff" strokeWidth="2" opacity="0.6" className="flow-line" markerEnd="url(#arr-blue)"/>
          <line x1="90" y1="140" x2="250" y2="140" stroke="#00b4d8" strokeWidth="1.8" opacity="0.55" className="flow-line-slow" markerEnd="url(#arr-teal)"/>
          <line x1="90" y1="210" x2="250" y2="148" stroke="#10b981" strokeWidth="1.5" opacity="0.5" className="flow-line-slow" markerEnd="url(#arr-green)"/>

          {/* MicroLink to carrier hotels */}
          <line x1="290" y1="140" x2="430" y2="65" stroke="#1a6fff" strokeWidth="1.8" opacity="0.5" className="flow-line"/>
          <line x1="290" y1="140" x2="430" y2="140" stroke="#00b4d8" strokeWidth="1.5" opacity="0.45" className="flow-line-slow"/>
          <line x1="290" y1="140" x2="420" y2="215" stroke="#10b981" strokeWidth="1.2" opacity="0.4" className="flow-line-slow"/>

          {/* Carrier hotels to cloud */}
          <line x1="460" y1="62" x2="610" y2="55" stroke="#f59e0b" strokeWidth="1.2" opacity="0.5" strokeDasharray="4,3"/>
          <line x1="460" y1="65" x2="610" y2="135" stroke="#1a6fff" strokeWidth="1.2" opacity="0.4" strokeDasharray="4,3"/>
          <line x1="460" y1="68" x2="610" y2="215" stroke="#ef4444" strokeWidth="1.2" opacity="0.4" strokeDasharray="4,3"/>

          {/* Latency labels */}
          <text x="165" y="95" fontFamily="monospace" fontSize="7" fill="#1a6fff" opacity="0.8" transform="rotate(-18,165,95)">200G 0.8ms</text>
          <text x="150" y="152" fontFamily="monospace" fontSize="7" fill="#00b4d8" opacity="0.8">100G 1.1ms</text>
          <text x="155" y="195" fontFamily="monospace" fontSize="7" fill="#10b981" opacity="0.8" transform="rotate(14,155,195)">100G 1.4ms</text>
          <text x="355" y="88" fontFamily="monospace" fontSize="7" fill="#1a6fff" opacity="0.6" transform="rotate(-18,355,88)">1.2ms</text>

          {/* MicroLink MMR — Center */}
          <circle cx="270" cy="140" r="30" fill="#e8f0ff" opacity="0.4" className="node-pulse"/>
          <circle cx="270" cy="140" r="27" fill="url(#nodeGrad)" stroke="#1a6fff" strokeWidth="1.5" filter="url(#node-shadow)"/>
          <text x="270" y="135" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#1a6fff" fontWeight="600">MICRO</text>
          <text x="270" y="146" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#1a6fff" fontWeight="600">LINK</text>
          <text x="270" y="156" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">MMR</text>

          {/* Zayo — top-left */}
          <circle cx="70" cy="70" r="22" fill="white" stroke="#1a6fff" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="70" y="68" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#1a6fff" fontWeight="600">ZAYO</text>
          <text x="70" y="79" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#10b981">200G</text>

          {/* Crown Castle — mid-left */}
          <circle cx="70" cy="140" r="22" fill="white" stroke="#00b4d8" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="70" y="135" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#00b4d8" fontWeight="600">CROWN</text>
          <text x="70" y="144" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#00b4d8" fontWeight="600">CASTLE</text>
          <text x="70" y="155" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#10b981">100G</text>

          {/* Lightpath — bottom-left */}
          <circle cx="70" cy="210" r="22" fill="white" stroke="#10b981" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="70" y="206" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#10b981" fontWeight="600">LIGHT</text>
          <text x="70" y="216" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#10b981" fontWeight="600">PATH</text>
          <text x="70" y="226" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#10b981">100G</text>

          {/* 60 Hudson — center-right top */}
          <circle cx="445" cy="62" r="25" fill="white" stroke="#1a6fff" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="445" y="58" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#0f172a" fontWeight="600">60 Hudson</text>
          <text x="445" y="70" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">NYC 1.2ms</text>

          {/* 32 Ave of Americas — center-right mid */}
          <circle cx="445" cy="140" r="22" fill="white" stroke="#00b4d8" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="445" y="134" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#0f172a" fontWeight="600">32 Ave of</text>
          <text x="445" y="143" textAnchor="middle" fontFamily="sans-serif" fontSize="6.5" fill="#0f172a" fontWeight="600">Americas</text>
          <text x="445" y="153" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">1.6ms</text>

          {/* 111 8th — center-right bottom */}
          <circle cx="435" cy="215" r="20" fill="white" stroke="#10b981" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="435" y="212" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#0f172a" fontWeight="600">111 8th</text>
          <text x="435" y="222" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">2.1ms</text>

          {/* AWS — far right top */}
          <circle cx="625" cy="55" r="17" fill="#fff8ec" stroke="#f59e0b" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="625" y="53" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#f59e0b" fontWeight="600">AWS</text>
          <text x="625" y="62" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">2.1ms</text>

          {/* Azure — far right mid */}
          <circle cx="630" cy="135" r="17" fill="#eef5ff" stroke="#1a6fff" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="630" y="133" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#1a6fff" fontWeight="600">Azure</text>
          <text x="630" y="142" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">2.4ms</text>

          {/* GCP — far right bottom */}
          <circle cx="625" cy="215" r="17" fill="#fff0f0" stroke="#ef4444" strokeWidth="1.2" filter="url(#node-shadow)"/>
          <text x="625" y="213" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fill="#ef4444" fontWeight="600">GCP</text>
          <text x="625" y="222" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94a3b8">3.1ms</text>

          {/* Capacity ring on MMR */}
          <circle cx="270" cy="140" r="27" fill="none" stroke="#1a6fff" strokeWidth="2"
            strokeDasharray="106 64" strokeDashoffset="18" opacity="0.25"
            transform="rotate(-90 270 140)"/>

          {/* Column labels */}
          <text x="70" y="255" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#94a3b8">CARRIERS</text>
          <text x="270" y="255" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#94a3b8">MMR</text>
          <text x="445" y="255" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#94a3b8">PEERING</text>
          <text x="625" y="255" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#94a3b8">CLOUD</text>
        </svg>
      </div>
    </div>
  );
}

/* ── Carrier Status ───────────────────────────────────────────── */
function CarrierList({ carriers }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Carrier Status</h3>
      <div className="space-y-2">
        {carriers.map(c => (
          <div key={c.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-mcs-green' : 'bg-red-500'}`} />
              <span className="text-[11px] font-medium text-gray-700">{c.name}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-navy">{c.capacity_gbps}G</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Cloud Latency Table ──────────────────────────────────────── */
function LatencyTable({ data }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Cloud Latency</h3>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left py-0.5">Provider</th>
            <th className="text-right py-0.5">Latency</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.provider} className="border-t border-gray-50">
              <td className="py-1.5 text-gray-700 font-medium">{d.provider}</td>
              <td className="py-1.5 text-right font-mono font-bold text-navy">{d.latency_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Bandwidth Progress Bar ───────────────────────────────────── */
function BandwidthBar({ tenant, allocated, used }) {
  const pct = allocated > 0 ? (used / allocated) * 100 : 0;
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1 min-w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-gray-700">{tenant}</span>
        <span className="font-mono text-[10px] text-gray-400">{used}/{allocated} Gbps</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right mt-0.5">
        <span className="font-mono text-[10px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function Connectivity() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.connectivity().then(setData).catch(() => {});
  }, []);

  const d = data || {
    total_capacity_gbps: 400,
    used_capacity_gbps: 267,
    latency_manhattan_ms: 1.2,
    carrier_count: 3,
    uptime_pct: 99.99,
    cross_connects: 8,
    carriers: [
      { name: 'Zayo', capacity_gbps: 200, status: 'active' },
      { name: 'Crown Castle', capacity_gbps: 100, status: 'active' },
      { name: 'Lightpath', capacity_gbps: 100, status: 'active' },
    ],
    cloud_latency: [
      { provider: 'AWS', latency_ms: 2.1 },
      { provider: 'Azure', latency_ms: 2.4 },
      { provider: 'GCP', latency_ms: 3.1 },
    ],
    tenant_bandwidth: [
      { tenant: 'Equinix', allocated_gbps: 100, used_gbps: 82 },
      { tenant: 'GPU Cloud', allocated_gbps: 150, used_gbps: 128 },
      { tenant: 'Wholesale A', allocated_gbps: 100, used_gbps: 45 },
      { tenant: 'Edge Retail', allocated_gbps: 50, used_gbps: 12 },
    ],
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 6 Network KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard label="Capacity" value={d.total_capacity_gbps} unit="Gbps" color="#3B6BF5" compact />
        <KPICard label="Used" value={d.used_capacity_gbps} unit="Gbps" color="#06B6D4" compact />
        <KPICard label="Manhattan" value={d.latency_manhattan_ms} unit="ms" color="#F97316" compact />
        <KPICard label="Carriers" value={`${d.carrier_count}/3`} color="#10B981" compact />
        <KPICard label="Uptime" value={d.uptime_pct + '%'} color="#3B6BF5" compact />
        <KPICard label="Cross-Connects" value={d.cross_connects} color="#06B6D4" compact />
      </div>

      {/* Center topology + Right sidebar */}
      <div className="flex gap-3 flex-1 min-h-0">
        <NetworkTopologySVG />
        <div className="w-56 shrink-0 flex flex-col gap-3">
          <CarrierList carriers={d.carriers} />
          <LatencyTable data={d.cloud_latency} />
        </div>
      </div>

      {/* Bottom: Tenant Bandwidth */}
      <div className="flex gap-3 shrink-0">
        {d.tenant_bandwidth.map(tb => (
          <BandwidthBar key={tb.tenant} tenant={tb.tenant}
            allocated={tb.allocated_gbps} used={tb.used_gbps} />
        ))}
      </div>
    </div>
  );
}
