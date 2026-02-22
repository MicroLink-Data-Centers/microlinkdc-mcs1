import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, usePolling } from '../lib/api';
import ImagePlaceholder from '../components/ImagePlaceholder';

const IMAGE_SRC = '/images/Commercial.jpg';

const SERVICE_COLORS = { wholesale: '#3B6BF5', gpu_aas: '#06B6D4', edge: '#10B981' };

/* ── Capacity Segment Bar ─────────────────────────────────────── */
function SegmentedCapacityBar({ services }) {
  const total = services.reduce((a, s) => a + s.capacity_mw, 0) || 10;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity Allocation</h3>
        <span className="font-mono text-sm font-bold text-navy">{total} MW</span>
      </div>
      <div className="flex rounded-lg overflow-hidden h-8 mb-3">
        {services.map(s => (
          <div key={s.type}
            className="flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${(s.capacity_mw / total) * 100}%`, background: s.color || SERVICE_COLORS[s.type] }}>
            {s.label} {s.capacity_mw} MW
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Revenue Donut ────────────────────────────────────────────── */
function RevenueDonut({ services, total }) {
  const data = services.map(s => ({
    name: s.label,
    value: s.revenue,
    color: s.color || SERVICE_COLORS[s.type],
  }));

  const fmt = (v) => `$${(v / 1000).toFixed(0)}K`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Monthly Revenue</h3>
      <div className="h-52 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
              dataKey="value" paddingAngle={2} strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-xl font-bold text-navy">${(total / 1000000).toFixed(1)}M</span>
          <span className="text-[10px] text-gray-400">per month</span>
        </div>
      </div>
      <div className="space-y-1.5 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </div>
            <span className="font-mono font-semibold text-gray-700">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tenant Card ──────────────────────────────────────────────── */
function TenantCard({ tenant }) {
  const colors = { wholesale: '#3B6BF5', gpu_aas: '#06B6D4', edge: '#10B981' };
  const accent = colors[tenant.service_type] || '#3B6BF5';
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-navy">{tenant.name}</h4>
        <div className="w-2 h-2 rounded-full bg-mcs-green" title="Active" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-lg font-bold" style={{ color: accent }}>{tenant.capacity_mw}</div>
          <div className="text-[10px] text-gray-400">MW</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-navy">{tenant.uptime_pct}%</div>
          <div className="text-[10px] text-gray-400">Uptime</div>
        </div>
        <div>
          <div className="font-mono text-lg font-bold" style={{ color: accent }}>
            ${(tenant.monthly_revenue / 1000).toFixed(0)}K
          </div>
          <div className="text-[10px] text-gray-400">/month</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function Commercial() {
  const [billing, setBilling] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    api.billingSummary().then(setBilling).catch(() => {});
    api.listTenants().then(setTenants).catch(() => {});
  }, []);

  const services = billing?.by_service || [
    { type: 'wholesale', label: 'Wholesale', revenue: 925000, capacity_mw: 5.0, color: '#3B6BF5' },
    { type: 'gpu_aas', label: 'GPU-aaS', revenue: 1100000, capacity_mw: 3.0, color: '#06B6D4' },
    { type: 'edge', label: 'Edge', revenue: 375000, capacity_mw: 2.0, color: '#10B981' },
  ];
  const totalRevenue = billing?.total_monthly_revenue || 2400000;

  const displayTenants = tenants.length > 0 ? tenants : [
    { id: 1, name: 'Equinix', capacity_mw: 3, uptime_pct: 99.99, monthly_revenue: 555000, service_type: 'wholesale' },
    { id: 2, name: 'GPU Cloud', capacity_mw: 2.5, uptime_pct: 99.97, monthly_revenue: 875000, service_type: 'gpu_aas' },
    { id: 3, name: 'Wholesale A', capacity_mw: 2, uptime_pct: 99.98, monthly_revenue: 370000, service_type: 'wholesale' },
    { id: 4, name: 'Edge Retail', capacity_mw: 0.5, uptime_pct: 99.95, monthly_revenue: 150000, service_type: 'edge' },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Segmented Capacity Bar */}
      <SegmentedCapacityBar services={services} />

      {/* Center + Right Sidebar */}
      <div className="flex gap-3 flex-1 min-h-0">
        <div className="flex-1 flex justify-center">
          {IMAGE_SRC ? (
            <img src={IMAGE_SRC} alt="Commercial" className="rounded-xl max-w-[1000px] w-full" style={{ maxHeight: 300, objectFit: 'cover' }} />
          ) : (
            <ImagePlaceholder label="Commercial Overview" width={1000} height={300} />
          )}
        </div>
        <div className="w-72 shrink-0">
          <RevenueDonut services={services} total={totalRevenue} />
        </div>
      </div>

      {/* Tenant Cards */}
      <div className="flex gap-3 shrink-0">
        {displayTenants.map(t => <TenantCard key={t.id} tenant={t} />)}
      </div>
    </div>
  );
}
