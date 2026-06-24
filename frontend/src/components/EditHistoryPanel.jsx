import { History, User, Clock } from "lucide-react";

/**
 * Reusable Edit History Panel
 * Props:
 *   createdBy  - Name of the user who created the record
 *   createdAt  - ISO timestamp of creation
 *   updatedBy  - Name of the user who last updated the record
 *   updatedAt  - ISO timestamp of last update
 *   history    - Array of history objects: [{ user, action, timestamp }]
 */
export default function EditHistoryPanel({ createdBy, createdAt, updatedBy, updatedAt, history = [] }) {
  function fmtDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Fallback if history is empty but createdBy exists
  const timelineItems = [...history];
  if (timelineItems.length === 0 && createdBy) {
    timelineItems.push({
      user: createdBy,
      action: "Created",
      timestamp: createdAt,
    });
  }

  // Sort timeline items by timestamp descending
  const sortedItems = timelineItems.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-4">
      <p className="label mb-3 flex items-center gap-1.5 font-semibold text-ink-700 dark:text-ink-300">
        <History size={14} className="text-brand-500" /> Edit History
      </p>

      {sortedItems.length === 0 ? (
        <p className="text-sm text-ink-400 italic">No edit history available.</p>
      ) : (
        <div className="relative border-l border-ink-200 dark:border-ink-700 ml-2.5 pl-4 space-y-4 py-1">
          {sortedItems.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline marker */}
              <span className="absolute -left-[21.5px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white dark:ring-ink-900 group-hover:scale-110 transition-transform">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-ink-800 dark:text-white flex items-center gap-1">
                    <User size={10} className="text-ink-400" />
                    {item.user}
                  </span>
                  <span className="text-[10px] text-ink-400 flex items-center gap-0.5">
                    <Clock size={10} />
                    {fmtDateTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-300 bg-ink-50 dark:bg-ink-800/40 px-2 py-1 rounded mt-0.5">
                  {item.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
