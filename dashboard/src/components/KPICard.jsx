export default function KPICard({ label, value, unit, color = '#3B6BF5', icon, compact = false }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-w-0 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <span className={`font-medium text-gray-500 uppercase tracking-wider truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {label}
        </span>
        {icon && <span className="text-sm shrink-0" style={{ color }}>{icon}</span>}
      </div>
      <div className="flex items-baseline space-x-1">
        <span className={`font-bold font-mono ${compact ? 'text-lg' : 'text-xl'}`} style={{ color }}>{value}</span>
        {unit && <span className={`text-gray-400 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>{unit}</span>}
      </div>
    </div>
  );
}
