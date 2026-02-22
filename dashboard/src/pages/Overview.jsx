import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { api, usePolling } from '../lib/api';
import ImagePlaceholder from '../components/ImagePlaceholder';
import KPICard from '../components/KPICard';

const IMAGE_SRC = '/images/overview.jpg';
const BLOCK_SLUG = 'baldwinsville-01';

/* ── Capacity Bar ─────────────────────────────────────────────── */
function CapacityBar() {
  const segments = [
    { label: 'Wholesale', mw: 5, color: '#3B6BF5' },
    { label: 'GPU-aaS', mw: 3, color: '#06B6D4' },
    { label: 'Edge', mw: 2, color: '#10B981' },
  ];
  const total = 10;
  return (
    <div>
      <div className="flex rounded-lg overflow-hidden h-5 mb-1.5">
        {segments.map(s => (
          <div key={s.label}
            className="flex items-center justify-center text-white text-[9px] font-bold"
            style={{ width: `${(s.mw / total) * 100}%`, background: s.color }}>
            {s.mw} MW
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sparkline Card ───────────────────────────────────────────── */
function SparklineCard({ title, data, dataKey, color, unit }) {
  const values = data.map(d => d[dataKey]).filter(v => typeof v === 'number');
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const fmt = (v) => typeof v === 'number' ? (v >= 1000 ? `${(v/1000).toFixed(1)}K` : (Number.isInteger(v) ? v : v.toFixed(2))) : v;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{title}</span>
        {min !== null && (
          <span className="text-[9px] font-mono text-gray-400">
            {fmt(min)}{unit} — {fmt(max)}{unit}
          </span>
        )}
      </div>
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
              fill={`url(#grad-${title})`} dot={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8 }}
              formatter={(v) => [`${typeof v === 'number' ? v.toFixed(1) : v}${unit || ''}`, title]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Quick Stats ──────────────────────────────────────────────── */
function QuickStats() {
  const stats = [
    { label: 'Avg Rack Density', value: '46 kW' },
    { label: 'Power Usage', value: '9.2 / 10 MW' },
    { label: 'Heat Export Temp', value: '55\u00b0C' },
    { label: 'Next Maintenance', value: '14 days' },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Stats</h3>
      <div className="space-y-1.5 text-[11px]">
        {stats.map(s => (
          <div key={s.label} className="flex justify-between">
            <span className="text-gray-500">{s.label}</span>
            <span className="font-mono font-semibold text-navy">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function Overview() {
  const MONTHS_6 = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  const staticTrend = MONTHS_6.map((m, i) => ({
    time: m,
    pue: [1.09, 1.08, 1.07, 1.07, 1.06, 1.06][i],
    revenue: [1.8, 2.0, 2.1, 2.2, 2.3, 2.4][i],
    heat: [4200, 3800, 3100, 2400, 2100, 2600][i],
    uptime: [99.94, 99.97, 99.98, 99.99, 99.98, 99.98][i],
  }));

  const { data: latest } = usePolling(
    () => api.getLatestValues(BLOCK_SLUG), 5000, [BLOCK_SLUG]
  );
  const { data: alarmStats } = usePolling(
    () => api.alarmStats(), 15000, []
  );

  const readingsMap = {};
  if (latest?.readings) {
    for (const r of latest.readings) {
      readingsMap[(r.tag || '').toLowerCase()] = r.value;
    }
  }
  const itLoad = (readingsMap['pdu_total_kw'] || readingsMap['pdu.total_kw'] || 9200) / 1000;
  const standing = alarmStats?.standing ?? 3;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard label="IT Load" value={itLoad.toFixed(1)} unit="MW" color="#3B6BF5" />
        <KPICard label="PUE" value="1.06" color="#06B6D4" />
        <KPICard label="Heat Recovery" value="87" unit="%" color="#10B981" />
        <KPICard label="Uptime" value="99.98" unit="%" color="#3B6BF5" />
        <KPICard label="Active Alarms" value={standing} color={standing > 0 ? '#F97316' : '#10B981'} />
        <KPICard label="Occupied" value="78" unit="%" color="#06B6D4" />
      </div>

      {/* Center + Right Sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 flex justify-center">
          {IMAGE_SRC ? (
            <img src={IMAGE_SRC} alt="Site Overview" className="rounded-xl max-w-[1200px] w-full" style={{ maxHeight: 320, objectFit: 'cover' }} />
          ) : (
            <ImagePlaceholder label="Site Overview" width={1200} height={520} />
          )}
        </div>
        <div className="w-56 shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Site Status</h3>
            <div className="space-y-1.5 text-[11px]">
              <StatusRow label="Operational" value="Active" color="#10B981" />
              <StatusRow label="Halls" value="2 / 2" />
              <StatusRow label="Blocks" value="10 / 10" />
              <StatusRow label="CDU Units" value="10 Online" color="#10B981" />
              <StatusRow label="Heat Export" value="Active" color="#10B981" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Capacity</h3>
            <CapacityBar />
          </div>
          <QuickStats />
        </div>
      </div>

      {/* Bottom sparklines */}
      <div className="flex gap-3 shrink-0">
        <SparklineCard title="PUE" data={staticTrend} dataKey="pue" color="#3B6BF5" unit="" />
        <SparklineCard title="Revenue" data={staticTrend} dataKey="revenue" color="#06B6D4" unit="M" />
        <SparklineCard title="Heat Delivered" data={staticTrend} dataKey="heat" color="#10B981" unit=" MWh" />
        <SparklineCard title="Uptime" data={staticTrend} dataKey="uptime" color="#F97316" unit="%" />
      </div>
    </div>
  );
}

function StatusRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono font-semibold" style={{ color: color || '#1E2746' }}>{value}</span>
    </div>
  );
}
