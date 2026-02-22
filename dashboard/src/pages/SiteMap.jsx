import { api, usePolling } from '../lib/api';

const ACTIVE_ALARMS = [
  { id: 1, priority: 'P0', tag: 'CDU-01-T-RET', desc: 'Return temp high \u2014 46.1\u00b0C exceeds 45\u00b0C limit', subsystem: 'cooling' },
  { id: 2, priority: 'P1', tag: 'UPS-01-BATT', desc: 'Battery charge below 95% threshold', subsystem: 'electrical' },
  { id: 3, priority: 'P1', tag: 'ENV-HUMIDITY', desc: 'Ambient humidity elevated \u2014 62% RH', subsystem: 'environmental' },
];

/* ── Pod KW data ─────────────────────────────────────────────── */
const POD_KW = { P1: 920, P2: 940, P3: 880, P4: 950, P5: 910, P6: 900, P7: 0, P8: 0, P9: 930, P10: 945 };

/* ── Pod rectangle ────────────────────────────────────────────── */
function Pod({ x, y, label, status }) {
  const fills = { active: '#10B981', commissioning: '#F97316', alarm: '#EF4444' };
  const fill = fills[status] || fills.active;
  const kw = POD_KW[label] || 0;
  const statusText = status === 'active' ? 'Active' : status === 'commissioning' ? 'Commissioning' : 'Alarm';
  const tooltip = `${label} — 20 racks — ${kw} kW — ${statusText}`;
  return (
    <g className={status === 'alarm' ? 'pod-alarm-pulse' : undefined}>
      <title>{tooltip}</title>
      <rect x={x} y={y} width={80} height={48} rx={6} fill={fill} opacity={0.85} stroke={fill} strokeWidth={1.5}/>
      <text x={x + 40} y={y + 22} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={13} fill="white" fontWeight={700}>{label}</text>
      <text x={x + 40} y={y + 37} textAnchor="middle" fontFamily="monospace" fontSize={8} fill="white" opacity={0.8}>
        {status === 'active' ? '20 racks' : status === 'commissioning' ? 'COMM' : 'ALARM'}
      </text>
      {status === 'alarm' && (
        <>
          <circle cx={x + 70} cy={y + 10} r={5} fill="#EF4444" className="alarm-pulse"/>
          <circle cx={x + 70} cy={y + 10} r={3} fill="white"/>
        </>
      )}
      {status === 'commissioning' && (
        <circle cx={x + 70} cy={y + 10} r={4} fill="#F97316" stroke="white" strokeWidth={1.5}/>
      )}
    </g>
  );
}

/* ── Room rectangle ───────────────────────────────────────────── */
function Room({ x, y, w, h, fill, label, sublabel, fontSize = 10 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke="#CBD5E1" strokeWidth={0.8}/>
      <text x={x + w / 2} y={y + h / 2 - (sublabel ? 4 : 0)} textAnchor="middle" dominantBaseline="middle"
        fontFamily='"DM Sans", sans-serif' fontSize={fontSize} fill="#334155" fontWeight={600}>{label}</text>
      {sublabel && (
        <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" dominantBaseline="middle"
          fontFamily="monospace" fontSize={7.5} fill="#64748B">{sublabel}</text>
      )}
    </g>
  );
}

/* ── Camera icon (diamond) ────────────────────────────────────── */
function Camera({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-5} y={-5} width={10} height={10} rx={1.5} fill="#94A3B8" transform="rotate(45)" opacity={0.7}/>
      <circle cx={0} cy={0} r={2} fill="white"/>
    </g>
  );
}

/* ── WRRF Digester circle ─────────────────────────────────────── */
function Digester({ cx, cy }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill="#FEF3C7" stroke="#D97706" strokeWidth={1} opacity={0.9}/>
      <circle cx={cx} cy={cy} r={8} fill="#FDE68A" stroke="#D97706" strokeWidth={0.5}/>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  FLOOR PLAN SVG                                                */
/* ═══════════════════════════════════════════════════════════════ */
function FloorPlanSVG() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex-1 flex flex-col overflow-hidden">
      <svg viewBox="0 0 960 544" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Dot pattern background */}
          <pattern id="fp-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r={0.7} fill="#CBD5E1" opacity={0.4}/>
          </pattern>
          {/* Alarm pulse + pod pulse animations */}
          <style>{`
            .alarm-pulse { animation: alarmBlink 1.2s ease-in-out infinite; }
            @keyframes alarmBlink { 0%,100%{ opacity:1; r:5; } 50%{ opacity:0.3; r:8; } }
            .pod-alarm-pulse { animation: podPulse 2s ease-in-out infinite; transform-origin: center; }
            @keyframes podPulse { 0%,100%{ transform: scale(1); opacity:1; } 50%{ transform: scale(1.05); opacity:0.7; } }
          `}</style>
        </defs>

        {/* ── Background ──────────────────────────────────────── */}
        <rect width="960" height="544" fill="#FAFBFC" rx={8}/>
        <rect width="960" height="544" fill="url(#fp-dots)" rx={8}/>

        {/* ── Header ──────────────────────────────────────────── */}
        <text x={28} y={30} fontFamily='"DM Sans", sans-serif' fontSize={14} fill="#1E2746" fontWeight={700} letterSpacing={1.5}>
          FLOOR PLAN — ALL LEVELS
        </text>
        <rect x={240} y={17} width={42} height={18} rx={9} fill="#ECFDF5" stroke="#A7F3D0" strokeWidth={1}/>
        <circle cx={252} cy={26} r={3} fill="#10B981"/>
        <text x={262} y={30} fontFamily="monospace" fontSize={8} fill="#10B981" fontWeight={700}>LIVE</text>

        {/* North arrow */}
        <g transform="translate(920,30)">
          <line x1={0} y1={12} x2={0} y2={-8} stroke="#64748B" strokeWidth={1.5} markerEnd="url(#fp-north-arr)"/>
          <text x={0} y={-12} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={9} fill="#64748B" fontWeight={700}>N</text>
        </g>
        <defs>
          <marker id="fp-north-arr" markerWidth={6} markerHeight={5} refX={3} refY={5} orient="auto">
            <path d="M0,5 L3,0 L6,5 Z" fill="#64748B"/>
          </marker>
        </defs>

        {/* ── Perimeter Fence ─────────────────────────────────── */}
        <rect x={15} y={45} width={930} height={490} rx={6} fill="none"
          stroke="#F97316" strokeWidth={2} strokeDasharray="12,6" opacity={0.7}/>

        {/* ── Building Footprint ──────────────────────────────── */}
        <rect x={35} y={65} width={650} height={435} rx={5} fill="white" stroke="#94A3B8" strokeWidth={1.5}/>

        {/* ═══ HALL A ═══════════════════════════════════════════ */}
        <rect x={40} y={70} width={485} height={210} rx={4} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={0.8}/>
        {/* Hall A label stripe */}
        <text x={50} y={84} fontFamily="monospace" fontSize={8.5} fill="#3B82F6" fontWeight={600} letterSpacing={0.8}>
          HALL A
        </text>

        {/* Pods row */}
        <Pod x={55}  y={93} label="P1" status="active"/>
        <Pod x={145} y={93} label="P2" status="active"/>
        <Pod x={235} y={93} label="P3" status="alarm"/>
        <Pod x={325} y={93} label="P4" status="active"/>
        <Pod x={415} y={93} label="P5" status="active"/>

        {/* Hall A capacity label */}
        <text x={270} y={162} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={9.5} fill="#3B82F6" fontWeight={600} letterSpacing={0.5}>
          DATA HALL A — 100 RACKS — 5 MW
        </text>

        {/* Hall A bottom rooms */}
        <Room x={55}  y={175} w={120} h={55} fill="#FAF5FF" label="NOC" sublabel="Operations"/>
        <Room x={185} y={175} w={120} h={55} fill="#FAF5FF" label="MMR" sublabel="Meet-Me Room"/>
        <Room x={315} y={175} w={200} h={55} fill="#F1F5F9" label="LOADING" sublabel="Dock / Staging"/>

        {/* Separator line */}
        <line x1={40} y1={280} x2={685} y2={280} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4,3"/>

        {/* ═══ HALL B ═══════════════════════════════════════════ */}
        <rect x={40} y={285} width={485} height={210} rx={4} fill="#F0FDFA" stroke="#99F6E4" strokeWidth={0.8}/>
        <text x={50} y={299} fontFamily="monospace" fontSize={8.5} fill="#0D9488" fontWeight={600} letterSpacing={0.8}>
          HALL B
        </text>

        {/* Pods row */}
        <Pod x={55}  y={308} label="P6"  status="active"/>
        <Pod x={145} y={308} label="P7"  status="commissioning"/>
        <Pod x={235} y={308} label="P8"  status="commissioning"/>
        <Pod x={325} y={308} label="P9"  status="active"/>
        <Pod x={415} y={308} label="P10" status="active"/>

        {/* Hall B capacity label */}
        <text x={270} y={377} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={9.5} fill="#0D9488" fontWeight={600} letterSpacing={0.5}>
          DATA HALL B — 100 RACKS — 5 MW
        </text>

        {/* Hall B bottom rooms */}
        <Room x={55}  y={390} w={140} h={55} fill="#F0FDF4" label="BESS" sublabel="Battery Storage"/>
        <Room x={205} y={390} w={200} h={55} fill="#F1F5F9" label="OPS / FIRE STORE" sublabel="Ops & Safety"/>

        {/* ═══ RIGHT COLUMN — MECHANICAL/ELECTRICAL ═══════════ */}
        {/* CDU-A */}
        <Room x={530} y={70}  w={150} h={80}  fill="#FFF7ED" label="CDU-A" sublabel="Cooling Dist."/>
        {/* Electrical / UPS */}
        <Room x={530} y={155} w={150} h={65}  fill="#F0FDF4" label="ELEC" sublabel="UPS RM"/>
        {/* Transformer */}
        <Room x={530} y={225} w={150} h={50}  fill="#F0FDF4" label="XFMR" sublabel="11 kV"/>

        {/* CDU-B */}
        <Room x={530} y={285} w={150} h={80}  fill="#FFF7ED" label="CDU-B" sublabel="Cooling Dist."/>
        {/* Thermal plant */}
        <Room x={530} y={370} w={150} h={65}  fill="#FFF7ED" label="THERMAL" sublabel="AHU PUMPS"/>
        {/* Electrical L1 */}
        <Room x={530} y={440} w={150} h={55}  fill="#F0FDF4" label="ELEC L1" sublabel="Switchgear"/>

        {/* ═══ GEN YARD ═══════════════════════════════════════ */}
        <rect x={55} y={430} width={280} height={48} rx={4} fill="#F5F5F4" stroke="#A8A29E" strokeWidth={1} strokeDasharray="6,3"/>
        <text x={195} y={452} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={11} fill="#57534E" fontWeight={600}>GEN YARD</text>
        <text x={195} y={465} textAnchor="middle" fontFamily="monospace" fontSize={8} fill="#A8A29E">2N Generators</text>
        {/* Generator symbols */}
        {[80, 120, 160, 200, 240, 280].map(gx => (
          <rect key={gx} x={gx} y={458} width={20} height={10} rx={2} fill="#D6D3D1" stroke="#A8A29E" strokeWidth={0.5}/>
        ))}

        {/* ═══ SECURE ENTRY ═══════════════════════════════════ */}
        {/* Gate */}
        <rect x={380} y={487} width={120} height={36} rx={4} fill="#FEF2F2" stroke="#F87171" strokeWidth={1}/>
        <text x={440} y={503} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={10} fill="#DC2626" fontWeight={700}>SECURE ENTRY</text>
        <text x={440} y={516} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="#F87171">24/7 Manned</text>
        {/* Guard booth */}
        <rect x={505} y={490} width={26} height={26} rx={3} fill="#FEE2E2" stroke="#F87171" strokeWidth={0.8}/>
        <text x={518} y={507} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="#DC2626">GRD</text>
        {/* Gate barriers */}
        <line x1={395} y1={487} x2={395} y2={480} stroke="#F87171" strokeWidth={2} strokeLinecap="round"/>
        <line x1={485} y1={487} x2={485} y2={480} stroke="#F87171" strokeWidth={2} strokeLinecap="round"/>

        {/* Fiber / Carrier labels at entry */}
        <text x={440} y={535} textAnchor="middle" fontFamily="monospace" fontSize={7.5} fill="#64748B" letterSpacing={0.5}>
          FIBER &middot; COMM &middot; ZAYO &middot; CROWN CASTLE &middot; LIGHTPATH
        </text>

        {/* ═══ WRRF EGG DIGESTERS ═════════════════════════════ */}
        {/* Thermal pipe from building to WRRF */}
        <line x1={685} y1={150} x2={722} y2={150} stroke="#F97316" strokeWidth={2} strokeDasharray="8,4"/>
        <line x1={722} y1={150} x2={722} y2={120} stroke="#F97316" strokeWidth={2} strokeDasharray="8,4"/>
        <line x1={722} y1={120} x2={745} y2={120} stroke="#F97316" strokeWidth={2} strokeDasharray="8,4"/>
        {/* Arrow head */}
        <polygon points="745,115 755,120 745,125" fill="#F97316" opacity={0.8}/>
        {/* Pipe label */}
        <text x={733} y={100} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="#F97316" fontWeight={600} transform="rotate(-0,733,100)">
          THERMAL CONNECTION
        </text>
        <text x={733} y={110} textAnchor="middle" fontFamily="monospace" fontSize={7.5} fill="#EA580C" fontWeight={700}>
          55&deg;C
        </text>

        {/* WRRF compound */}
        <rect x={755} y={68} width={170} height={130} rx={6} fill="#FFFBEB" stroke="#D97706" strokeWidth={1} strokeDasharray="5,3" opacity={0.6}/>
        <text x={840} y={85} textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontSize={9} fill="#92400E" fontWeight={700}>WRRF — EGG DIGESTERS</text>

        {/* 8 digester circles: 2 rows of 4 */}
        <Digester cx={785} cy={115}/>
        <Digester cx={820} cy={115}/>
        <Digester cx={855} cy={115}/>
        <Digester cx={890} cy={115}/>
        <Digester cx={785} cy={155}/>
        <Digester cx={820} cy={155}/>
        <Digester cx={855} cy={155}/>
        <Digester cx={890} cy={155}/>

        {/* ═══ CAMERAS (diamond icons) ════════════════════════ */}
        <Camera x={25}  y={55}/>
        <Camera x={935} y={55}/>
        <Camera x={25}  y={528}/>
        <Camera x={935} y={528}/>
        <Camera x={370} y={483}/>
        <Camera x={510} y={483}/>
        {/* Labels for corner cameras */}
        <text x={38} y={52} fontFamily="monospace" fontSize={6} fill="#94A3B8">CAM1</text>
        <text x={910} y={52} fontFamily="monospace" fontSize={6} fill="#94A3B8">CAM2</text>
        <text x={38} y={540} fontFamily="monospace" fontSize={6} fill="#94A3B8">CAM3</text>
        <text x={910} y={540} fontFamily="monospace" fontSize={6} fill="#94A3B8">CAM4</text>

        {/* ═══ LEGEND in bottom-right of SVG ══════════════════ */}
        <g transform="translate(580,430)">
          <rect x={0} y={0} width={165} height={100} rx={6} fill="white" stroke="#E2E8F0" strokeWidth={1} opacity={0.95}/>
          <text x={12} y={16} fontFamily="monospace" fontSize={8} fill="#64748B" fontWeight={600} letterSpacing={0.8}>POD STATUS</text>
          {/* Active */}
          <rect x={12} y={24} width={14} height={9} rx={2} fill="#10B981"/>
          <text x={32} y={31} fontFamily='"DM Sans", sans-serif' fontSize={8.5} fill="#334155">Active</text>
          {/* Commissioning */}
          <rect x={12} y={38} width={14} height={9} rx={2} fill="#F97316"/>
          <text x={32} y={45} fontFamily='"DM Sans", sans-serif' fontSize={8.5} fill="#334155">Commissioning</text>
          {/* Alarm */}
          <rect x={12} y={52} width={14} height={9} rx={2} fill="#EF4444"/>
          <text x={32} y={59} fontFamily='"DM Sans", sans-serif' fontSize={8.5} fill="#334155">Alarm</text>
          {/* Digester */}
          <circle cx={19} cy={73} r={5} fill="#FDE68A" stroke="#D97706" strokeWidth={0.5}/>
          <text x={32} y={76} fontFamily='"DM Sans", sans-serif' fontSize={8.5} fill="#334155">WRRF Digester</text>
          {/* Camera */}
          <rect x={15} y={83} width={7} height={7} rx={1} fill="#94A3B8" transform="rotate(45,18.5,86.5)"/>
          <text x={32} y={91} fontFamily='"DM Sans", sans-serif' fontSize={8.5} fill="#334155">Security Camera</text>
        </g>

        {/* ═══ Scale bar ══════════════════════════════════════ */}
        <line x1={25} y1={540} x2={125} y2={540} stroke="#94A3B8" strokeWidth={1}/>
        <line x1={25} y1={536} x2={25} y2={540} stroke="#94A3B8" strokeWidth={1}/>
        <line x1={125} y1={536} x2={125} y2={540} stroke="#94A3B8" strokeWidth={1}/>
        <text x={75} y={537} textAnchor="middle" fontFamily="monospace" fontSize={7} fill="#94A3B8">~50m</text>

      </svg>
    </div>
  );
}

/* ── Status Row ───────────────────────────────────────────────── */
function StatusRow({ label, value, total, status }) {
  const color = status === 'ok' ? '#10B981' : status === 'warn' ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <div className="flex items-center space-x-1.5">
        {total !== undefined ? (
          <span className="font-mono text-xs font-bold text-navy">{value}/{total}</span>
        ) : (
          <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
        )}
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

/* ── Priority Badge ───────────────────────────────────────────── */
function PriorityBadge({ priority }) {
  const colors = { P0: 'bg-red-500', P1: 'bg-orange-500', P2: 'bg-amber-400', P3: 'bg-gray-400' };
  return (
    <span className={`${colors[priority] || 'bg-gray-400'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
      {priority}
    </span>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function SiteMap() {
  const { data: alarmData } = usePolling(
    () => api.listAlarms({ state: 'ACTIVE,ACKED,RTN_UNACK' }), 10000, []
  );
  const standing = alarmData?.standing ?? 3;

  return (
    <div className="flex gap-3 h-full">
      {/* Center: Floor Plan SVG */}
      <FloorPlanSVG />

      {/* Right sidebar */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        {/* Facility Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Facility Status</h3>
          <div className="space-y-0">
            <StatusRow label="Halls" value={2} total={2} status="ok" />
            <StatusRow label="Racks" value={195} total={200} status="ok" />
            <StatusRow label="Doors" value={4} total={4} status="ok" />
            <StatusRow label="Cameras" value={12} total={12} status="ok" />
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-gray-500">Perimeter</span>
              <span className="text-[11px] font-bold text-mcs-green flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-mcs-green inline-block" />
                <span>Secure</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-gray-500">Active Alarms</span>
              <span className={`font-mono text-xs font-bold ${standing > 0 ? 'text-mcs-orange' : 'text-mcs-green'}`}>
                {standing}
              </span>
            </div>
          </div>
        </div>

        {/* Active Alarm Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Alarms</h3>
          <div className="space-y-2">
            {ACTIVE_ALARMS.map(a => (
              <div key={a.id} className="flex items-start space-x-2">
                <PriorityBadge priority={a.priority} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-navy">{a.tag}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Zone Legend</h3>
          <div className="space-y-1.5">
            {[
              { label: 'Compute Hall A', color: '#3B82F6' },
              { label: 'Compute Hall B', color: '#0D9488' },
              { label: 'Mechanical / CDU', color: '#F97316' },
              { label: 'Electrical', color: '#10B981' },
              { label: 'Network / NOC', color: '#8B5CF6' },
              { label: 'Perimeter Fence', color: '#F97316' },
            ].map(z => (
              <div key={z.label} className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: z.color }} />
                <span className="text-[11px] text-gray-600">{z.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
