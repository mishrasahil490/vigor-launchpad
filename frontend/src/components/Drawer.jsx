import { X } from "lucide-react";

export default function Drawer({ open, onClose, title, subtitle, children, width = "max-w-xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
      {/* Backdrop — sits to the LEFT of the panel, never overlaps it */}
      <div
        className="flex-1 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel — fixed width on the right */}
      <div
        className={`w-full ${width} bg-white dark:bg-ink-800 shadow-2xl flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-ink-100 dark:border-ink-700 shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg text-ink-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:hover:text-white ml-4 shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
