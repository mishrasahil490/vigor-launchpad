export default function KpiCard({ icon: Icon, label, value, accent = "brand", trend }) {
  const accentMap = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300",
    coral: "bg-orange-50 text-accent-coral dark:bg-orange-500/10",
    gold: "bg-amber-50 text-accent-gold dark:bg-amber-500/10",
    mint: "bg-emerald-50 text-accent-mint dark:bg-emerald-500/10",
  };
  return (
    <div className="card p-4 flex items-start gap-3 min-w-[180px]">
      <div className={`rounded-xl p-2.5 ${accentMap[accent] || accentMap.brand}`}>
        {Icon && <Icon size={18} strokeWidth={2.2} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink-500 dark:text-ink-300 truncate">{label}</p>
        <p className="text-xl font-bold text-ink-900 dark:text-white font-display mt-0.5">{value}</p>
        {trend && <p className="text-xs text-ink-400 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}
