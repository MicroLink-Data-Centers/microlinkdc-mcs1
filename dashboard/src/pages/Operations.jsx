import { useState, useEffect, useRef, useMemo } from 'react';
import { api, usePolling } from '../lib/api';
import ImagePlaceholder from '../components/ImagePlaceholder';
import SemiGauge from '../components/SemiGauge';

const IMAGE_SRC = '/images/operations.jpg';
const BLOCK_SLUG = 'baldwinsville-01';
const WS_BASE = import.meta?.env?.VITE_MCS_WS_URL || 'ws://localhost:8000/api/v1';

/* ── Static mock sensors (shown when no live data) ───────────── */
const MOCK_SENSORS = [
  { id: 'm1', tag: 'CDU-01-T-SUP', value: 31.7, unit: '\u00b0C', quality: 0 },
  { id: 'm2', tag: 'CDU-01-T-RET', value: 46.1, unit: '\u00b0C', quality: 2 },
  { id: 'm3', tag: 'ML-FLOW', value: 605, unit: 'L/min', quality: 0 },
  { id: 'm4', tag: 'PHX-01-T-PRI', value: 48.2, unit: '\u00b0C', quality: 1 },
  { id: 'm5', tag: 'UPS-01-LOAD', value: 928, unit: 'kW', quality: 0 },
  { id: 'm6', tag: 'ENV-TEMP', value: 22.1, unit: '\u00b0C', quality: 0 },
];

/* ── Mini Sparkline ──────────────────────────────────────────── */
function MiniSparkline({ data, color = '#3B6BF5', width = 48, height = 16 }) {
  if (!data || data.length < 2) {
    // Static placeholder sparkline
    const pts = '0,10 8,8 16,12 24,6 32,9 40,7 48,8';
    return (
      <svg width={width} height={height} className="shrink-0 opacity-30">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 2) - 1}`
  ).join(' ');
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Floating Data Pin ───────────────────────────────────────── */
function DataPin({ label, value, unit, color, top, left }) {
  return (
    <div className="absolute flex items-center space-x-1.5 bg-white/95 backdrop-blur rounded-lg px-2 py-1 shadow-md border border-gray-100"
      style={{ top, left, transform: 'translate(-50%, -50%)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <div>
        <div className="text-[9px] text-gray-500 leading-none">{label}</div>
        <div className="font-mono text-xs font-bold leading-tight" style={{ color }}>
          {value}<span className="text-[9px] text-gray-400 ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Alarm Ticker ────────────────────────────────────────────── */
function AlarmTicker({ alarms }) {
  const text = alarms.length > 0
    ? alarms.map(a => `[${a.priority}] ${a.tag || 'SENSOR'}: ${a.state} \u2014 ${a.subsystem || 'SYSTEM'}`).join('     \u2022     ')
    : 'No active alarms';
  return (
    <div className="bg-amber-50 border-y border-amber-200 h-7 overflow-hidden flex items-center shrink-0">
      <div className="flex items-center space-x-2 px-3 shrink-0">
        <span className="text-amber-600 text-[10px] font-bold">ALARMS</span>
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="animate-ticker whitespace-nowrap text-[11px] font-medium text-amber-700">
          {text}
        </div>
      </div>
    </div>
  );
}

/* ── Quality Dot ─────────────────────────────────────────────── */
function QualityDot({ quality }) {
  const color = quality === 0 ? 'bg-mcs-green' : quality === 1 ? 'bg-amber-400' : 'bg-red-500';
  return <div className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}

/* ── Main Component ──────────────────────────────────────────── */
export default function Operations() {
  const [hall, setHall] = useState('A');
  const [sensorHistory, setSensorHistory] = useState({});
  const [readings, setReadings] = useState({});
  const wsRef = useRef(null);

  const { data: latestData } = usePolling(
    () => api.getLatestValues(BLOCK_SLUG), 5000, [BLOCK_SLUG]
  );

  const { data: alarmData } = usePolling(
    () => api.listAlarms({ state: 'ACTIVE,ACKED,RTN_UNACK' }), 5000, []
  );
  const activeAlarms = alarmData?.alarms || [];

  // WebSocket for live telemetry
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let attempts = 0;
    function connect() {
      try {
        ws = new WebSocket(`${WS_BASE}/ws/telemetry/${BLOCK_SLUG}`);
        ws.onopen = () => { attempts = 0; };
        ws.onmessage = (event) => {
          try {
            const d = JSON.parse(event.data);
            setReadings(prev => ({
              ...prev,
              [d.sensor_id]: { value: d.value, quality: d.quality, tag: d.tag, unit: d.unit, subsystem: d.subsystem, timestamp: d.timestamp }
            }));
            setSensorHistory(prev => {
              const history = [...(prev[d.sensor_id] || []), d.value];
              if (history.length > 20) history.shift();
              return { ...prev, [d.sensor_id]: history };
            });
          } catch { /* ignore */ }
        };
        ws.onclose = () => {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          attempts++;
          if (attempts < 15) reconnectTimeout = setTimeout(connect, delay);
        };
        ws.onerror = () => ws.close();
        wsRef.current = ws;
      } catch { /* connection failed */ }
    }
    connect();
    return () => { clearTimeout(reconnectTimeout); ws?.close(); };
  }, []);

  // Merge polled data
  useEffect(() => {
    if (!latestData?.readings) return;
    const merged = {};
    for (const r of latestData.readings) {
      merged[r.sensor_id] = { value: r.value, quality: r.quality, tag: r.tag, unit: r.unit, subsystem: r.subsystem, timestamp: r.timestamp };
      setSensorHistory(prev => {
        if (prev[r.sensor_id]) return prev;
        return { ...prev, [r.sensor_id]: [r.value] };
      });
    }
    setReadings(prev => ({ ...merged, ...prev }));
  }, [latestData]);

  // Sensor list: live data or mock fallback
  const sensorList = useMemo(() => {
    const live = Object.entries(readings)
      .map(([id, r]) => ({ id: Number(id), ...r }))
      .sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
    return live.length > 0 ? live : MOCK_SENSORS;
  }, [readings]);

  // Extract key values for pins
  const findSensor = (pattern) => {
    const s = sensorList.find(s => s.tag && s.tag.toLowerCase().includes(pattern));
    return s ? s.value : null;
  };
  const cduSupply = findSensor('sup') ?? 31.7;
  const cduReturn = findSensor('ret') ?? 46.1;
  const glycolFlow = findSensor('flow') ?? 605;
  const hostWater = findSensor('sec_out') ?? findSensor('host') ?? 55.2;

  const pueVal = 1.06;
  const recoveryPct = 87;
  const itUtil = 92;

  return (
    <div className="flex flex-col gap-2 h-full">
      <AlarmTicker alarms={activeAlarms} />

      {/* Main: left + center + right */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-36 shrink-0 flex flex-col gap-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Compute Halls</h3>
            {['A', 'B'].map(h => (
              <button key={h}
                onClick={() => setHall(h)}
                className={`w-full text-left px-2.5 py-2 rounded-lg mb-1 text-xs font-semibold transition-all ${
                  hall === h ? 'bg-mcs-blue text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                Hall {h}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Hall {hall} Status</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-gray-500">Racks</span><span className="font-mono font-semibold text-gray-700">{hall === 'A' ? 98 : 97}/100</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IT Load</span><span className="font-mono font-semibold text-gray-700">{hall === 'A' ? '4.8' : '4.4'} MW</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Temp</span><span className="font-mono font-semibold text-gray-700">{hall === 'A' ? '22.4' : '21.8'}&deg;C</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CDU</span><span className="font-mono font-semibold text-mcs-green">Online</span></div>
            </div>
          </div>
        </div>

        {/* Center: Image with floating pins */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div className="relative w-full max-w-[1000px]">
            {IMAGE_SRC ? (
              <img src={IMAGE_SRC} alt="Operations View" className="w-full rounded-xl bg-[#F8FAFC]" style={{ maxHeight: 340, objectFit: 'contain' }} />
            ) : (
              <ImagePlaceholder label={`Operations \u2014 Hall ${hall}`} width={1000} height={380} />
            )}
            <DataPin label="CDU Supply" value={typeof cduSupply === 'number' ? cduSupply.toFixed(1) : cduSupply} unit="&deg;C" color="#06B6D4" top="22%" left="25%" />
            <DataPin label="CDU Return" value={typeof cduReturn === 'number' ? cduReturn.toFixed(1) : cduReturn} unit="&deg;C" color="#EF4444" top="22%" left="75%" />
            <DataPin label="Glycol Flow" value={typeof glycolFlow === 'number' ? Math.round(glycolFlow) : glycolFlow} unit="L/min" color="#10B981" top="72%" left="28%" />
            <DataPin label="Host Water" value={typeof hostWater === 'number' ? hostWater.toFixed(1) : hostWater} unit="&deg;C" color="#F97316" top="72%" left="72%" />
          </div>
        </div>

        {/* Right sidebar: Live sensors */}
        <div className="w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Live Sensors <span className="text-gray-400 font-normal">({sensorList.length})</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sensorList.map(s => (
              <div key={s.id} className="flex items-center px-2.5 py-1.5 border-b border-gray-50 hover:bg-gray-50/50">
                <QualityDot quality={s.quality} />
                <div className="ml-1.5 flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 truncate">{s.tag || `Sensor ${s.id}`}</div>
                  <div className="font-mono text-xs font-bold text-navy leading-tight">
                    {typeof s.value === 'number' ? s.value.toFixed(1) : s.value}
                    <span className="text-[9px] text-gray-400 ml-0.5">{s.unit || ''}</span>
                  </div>
                </div>
                <MiniSparkline data={sensorHistory[s.id]} color="#94A3B8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: 3 gauges */}
      <div className="flex justify-center gap-10 py-1 shrink-0">
        <SemiGauge label="PUE" value={pueVal} max={2.0} unit="ratio" color="#3B6BF5" displayValue={pueVal.toFixed(2)} target="<1.10" size="small" />
        <SemiGauge label="Heat Recovery" value={recoveryPct} max={100} unit="%" color="#10B981" displayValue={`${recoveryPct}%`} target=">85%" size="small" />
        <SemiGauge label="IT Utilization" value={itUtil} max={100} unit="%" color="#06B6D4" displayValue={`${itUtil}%`} target=">80%" size="small" />
      </div>
    </div>
  );
}
