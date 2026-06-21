import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";

const REPORTS = [
  { key: "lead-conversion", label: "Lead Conversion Report" },
  { key: "employee-performance", label: "Employee Performance Report" },
  { key: "campaign-performance", label: "Campaign Performance Report" },
  { key: "influencer-performance", label: "Influencer Performance Report" },
  { key: "client-revenue", label: "Client Revenue Report" },
  { key: "event-profitability", label: "Event Profitability Report" },
  { key: "vendor-spend", label: "Vendor Spend Report" },
];

function fmtVal(v) {
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString("en-IN") : v;
  }
  return v ?? "—";
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState(REPORTS[0].key);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`/reports/${activeReport}`).then((res) => setRows(res.data.data));
  }, [activeReport]);

  const columns = rows.length ? Object.keys(rows[0]) : [];

  async function exportCSV() {
    const res = await api.get(`/reports/${activeReport}`, { params: { format: "csv" }, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeReport}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Analytics & Reporting" subtitle="Pre-built reports across every module, exportable to CSV." />

      <div className="flex flex-wrap gap-2 mb-5">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeReport === r.key ? "bg-brand-600 text-white" : "bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
          <p className="font-semibold text-ink-800 dark:text-white">{REPORTS.find((r) => r.key === activeReport)?.label}</p>
          <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 dark:bg-ink-900/40 text-left">
                {columns.map((c) => (
                  <th key={c} className="px-4 py-3 text-xs uppercase tracking-wide font-semibold text-ink-500 dark:text-ink-300 whitespace-nowrap">
                    {c.replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-ink-50 dark:border-ink-700/60 last:border-0">
                  {columns.map((c) => (
                    <td key={c} className="px-4 py-3 text-ink-700 dark:text-ink-100 whitespace-nowrap">{fmtVal(row[c])}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={columns.length || 1} className="px-4 py-10 text-center text-ink-400">No data available for this report yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
