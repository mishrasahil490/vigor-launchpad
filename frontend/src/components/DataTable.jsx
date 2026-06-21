import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";

export default function DataTable({ columns, rows, onRowClick, searchPlaceholder = "Search...", pageSize = 10, toolbar }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = rows;
    if (query.trim()) {
      const needle = query.toLowerCase();
      data = data.filter((row) =>
        columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(needle))
      );
    }
    if (sort.key) {
      data = [...data].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
        return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return data;
  }, [rows, query, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-ink-100 dark:border-ink-700">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 dark:bg-ink-900/40 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={`px-4 py-3 font-semibold text-ink-500 dark:text-ink-300 text-xs uppercase tracking-wide whitespace-nowrap ${
                    col.sortable !== false ? "cursor-pointer select-none" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort.key === col.key && (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-400">
                  No records found.
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-ink-50 dark:border-ink-700/60 last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-500/5" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink-700 dark:text-ink-100 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100 dark:border-ink-700 text-sm">
          <span className="text-ink-500">
            Page {page} of {totalPages} &middot; {filtered.length} records
          </span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button className="btn-ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
