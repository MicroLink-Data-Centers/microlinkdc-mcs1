export default function SemiGauge({ label, value, max = 100, unit = '%', color = '#3B6BF5', displayValue, target, size = 'normal' }) {
  const isSmall = size === 'small';
  const cx = isSmall ? 60 : 80;
  const cy = isSmall ? 55 : 75;
  const r = isSmall ? 42 : 60;
  const strokeW = isSmall ? 8 : 12;
  const svgW = isSmall ? 120 : 160;
  const svgH = isSmall ? 65 : 95;
  const pct = Math.min(Math.max(value / max, 0), 1);

  // Background: two quarter-arcs to avoid semicircle ambiguity
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;

  // Value arc from left toward right
  const angle = Math.PI * (1 - pct);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);

  const valPath = pct >= 0.99
    ? bgPath
    : `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${ex.toFixed(1)} ${ey.toFixed(1)}`;

  const shown = displayValue !== undefined ? displayValue : (
    typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value
  );

  const valueFontSize = isSmall ? 16 : 22;
  const unitFontSize = isSmall ? 9 : 11;

  return (
    <div className="flex flex-col items-center">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <path d={bgPath} fill="none" stroke="#E5E7EB" strokeWidth={strokeW} strokeLinecap="round" />
        {pct > 0.01 && (
          <path d={valPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        <text x={cx} y={cy - (isSmall ? 5 : 8)} textAnchor="middle" fill="#1E2746"
          style={{ fontSize: valueFontSize, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
          {shown}
        </text>
        <text x={cx} y={cy + (isSmall ? 7 : 10)} textAnchor="middle" fill="#94A3B8" style={{ fontSize: unitFontSize }}>
          {unit}
        </text>
      </svg>
      <span className="text-[11px] font-medium text-gray-600 mt-0.5">{label}</span>
      {target && (
        <span className="text-[9px] text-gray-400 mt-0.5">target: {target}</span>
      )}
    </div>
  );
}
