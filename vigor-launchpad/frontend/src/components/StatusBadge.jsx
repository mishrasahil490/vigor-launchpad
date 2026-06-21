const COLOR_MAP = {
  // Leads
  New: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Contacted: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  Qualified: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
  "Proposal Sent": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Negotiation: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  Won: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Lost: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  // Campaigns / events
  Planning: "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "In Progress": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  "Content Approval": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Live: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  // Tasks
  Pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  // Finance
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Unpaid: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  // Generic
  Active_user: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-rose-50 text-rose-700",
};

export default function StatusBadge({ status }) {
  const cls = COLOR_MAP[status] || "bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200";
  return <span className={`badge ${cls}`}>{status}</span>;
}
