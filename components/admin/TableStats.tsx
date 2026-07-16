interface Stat {
  label: string;
  value: string | number;
}

export default function TableStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white border border-gray-100 rounded-lg px-4 py-2 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
          <p className="text-lg font-semibold text-gray-800">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
