import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${width} card max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-ink-700 sticky top-0 bg-white dark:bg-ink-800 rounded-t-2xl">
          <h3 className="font-display font-semibold text-ink-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-100 dark:border-ink-700 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
