import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../lib/api';
import ImagePlaceholder from '../components/ImagePlaceholder';
import KPICard from '../components/KPICard';

const IMAGE_SRC = '/images/enviromental.jpg';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── PUE Comparison Bars ──────────────────────────────────────── */
function PUEComparison() {
  const bars = [
    { label: 'MicroLink', value: 1.06, color: '#10B981' },
    { label: 'Industry Avg', value: 1.30, color: '#F59E0B' },
    { label: 'NYC Average', value: 1.50, color: '#EF4444' },
  ];
  const max = 1.8;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">PUE Comparison</h3>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-gray-600">{b.label}</span>
              <span className="font-mono font-bold" style={{ color: b.color }}>{b.value}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(b.value / max) * 100}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Compliance Checklist ─────────────────────────────────────── */
function ComplianceChecklist({ compliance }) {
  const items = [
    { key: 'local_law_97', label: 'Local Law 97' },
    { key: 'clcpa', label: 'CLCPA' },
    { key: 'planyc_2050', label: 'PlaNYC 2050' },
    { key: 'esg_covenant', label: 'ESG Covenant' },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Compliance</h3>
      <div className="space-y-2">
        {items.map(item => {
          const passed = compliance?.[item.key] ?? true;
          return (
            <div key={item.key} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold ${
                passed ? 'bg-mcs-green' : 'bg-red-500'
              }`}>
                {passed ? '\u2713' : '\u2717'}
              </div>
              <span className="text-[11px] text-gray-700 font-medium">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function Environmental() {
  const [esg, setEsg] = useState(null);

  useEffect(() => {
    api.esgSummary().then(setEsg).catch(() => {});
  }, []);

  const d = esg || {
    co2_avoided_tonnes: 4820,
    gas_displaced_therms: 1200000,
    heat_delivered_mwh: 68400,
    homes_heated: 2450,
    avg_pue: 1.06,
    esg_rating: 'A+',
    compliance: { local_law_97: true, clcpa: true, planyc_2050: true, esg_covenant: true },
    monthly_heat_mwh: [5200, 4800, 4100, 3200, 2600, 2100, 1900, 2000, 2800, 3600, 4600, 5400],
  };

  const chartData = (d.monthly_heat_mwh || []).map((v, i) => ({ month: MONTHS[i], heat: v }));

  const fmtNum = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 6 ESG KPI Cards — compact */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard label="CO2 Avoided" value={fmtNum(d.co2_avoided_tonnes)} unit="tonnes" color="#10B981" compact />
        <KPICard label="Gas Displaced" value={fmtNum(d.gas_displaced_therms)} unit="therms" color="#06B6D4" compact />
        <KPICard label="Heat Delivered" value={fmtNum(d.heat_delivered_mwh)} unit="MWh" color="#F97316" compact />
        <KPICard label="Homes Heated" value={fmtNum(d.homes_heated)} color="#3B6BF5" compact />
        <KPICard label="PUE" value={d.avg_pue?.toFixed(2) || '1.06'} color="#06B6D4" compact />
        <KPICard label="ESG Rating" value={d.esg_rating || 'A+'} color="#10B981" compact />
      </div>

      {/* Center + Right Sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 flex justify-center">
          {IMAGE_SRC ? (
            <img src={IMAGE_SRC} alt="Environmental" className="rounded-xl max-w-[1000px] w-full bg-[#F8FAFC]" style={{ maxHeight: 340, objectFit: 'contain' }} />
          ) : (
            <ImagePlaceholder label="Environmental Overview" width={1000} height={340} />
          )}
        </div>
        {/* PUE + Compliance + Carbon Impact */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="flex gap-3">
            <PUEComparison />
            <ComplianceChecklist compliance={d.compliance} />
          </div>
          {/* Carbon Impact Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Annual Carbon Impact</h3>
            <div className="space-y-2">
              {[
                { label: 'CO\u2082 Avoided', value: '4,820 t/yr', color: '#10B981' },
                { label: 'Gas Displaced', value: '1.2M therms', color: '#3B6BF5' },
                { label: 'Equiv Trees Planted', value: '224,000', color: '#10B981' },
                { label: 'ERE', value: '0.06', color: '#06B6D4' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">{item.label}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom chart — shorter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 shrink-0">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Monthly Heat Recovery (MWh)
        </h3>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={35}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
                formatter={(v) => [`${v.toLocaleString()} MWh`, 'Heat Recovery']}
              />
              <Bar dataKey="heat" fill="#10B981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
