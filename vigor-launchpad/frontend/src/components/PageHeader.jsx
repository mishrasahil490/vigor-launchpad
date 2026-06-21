export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 dark:text-ink-300 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
