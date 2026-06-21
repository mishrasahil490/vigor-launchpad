import { useEffect, useState } from "react";
import { Plus, IndianRupee, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import FormField from "../components/FormField";

const TABS = ["Invoices", "Vendor Payments", "Expenses"];

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export default function Finance() {
  const [tab, setTab] = useState("Invoices");
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});

  function loadAll() {
    api.get("/finance/summary").then((res) => setSummary(res.data.data));
    api.get("/finance/invoices").then((res) => setInvoices(res.data.data));
    api.get("/finance/vendor-payments").then((res) => setVendorPayments(res.data.data));
    api.get("/finance/expenses").then((res) => setExpenses(res.data.data));
    api.get("/clients").then((res) => setClients(res.data.data));
    api.get("/vendors").then((res) => setVendors(res.data.data));
  }
  useEffect(loadAll, []);

  function clientName(id) { return clients.find((c) => c.id === id)?.brandName || "—"; }
  function vendorName(id) { return vendors.find((v) => v.id === id)?.vendorName || "—"; }

  async function markInvoicePaid(inv) {
    await api.put(`/finance/invoices/${inv.id}`, { status: "Paid" });
    loadAll();
  }
  async function markPaymentPaid(p) {
    await api.put(`/finance/vendor-payments/${p.id}`, { status: "Paid" });
    loadAll();
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (tab === "Invoices") {
      await api.post("/finance/invoices", { ...form, clientId: Number(form.clientId), amount: Number(form.amount) || 0 });
    } else if (tab === "Vendor Payments") {
      await api.post("/finance/vendor-payments", { ...form, vendorId: Number(form.vendorId), amount: Number(form.amount) || 0 });
    } else {
      await api.post("/finance/expenses", { ...form, amount: Number(form.amount) || 0 });
    }
    setShowCreate(false);
    setForm({});
    loadAll();
  }

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Invoices, vendor payments, budgets, and profitability."
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New {tab === "Vendor Payments" ? "Payment" : tab === "Expenses" ? "Expense" : "Invoice"}</button>}
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard icon={IndianRupee} label="Total Revenue" value={fmt(summary.revenue)} accent="mint" />
          <KpiCard icon={AlertCircle} label="Outstanding (Client)" value={fmt(summary.outstanding)} accent="coral" />
          <KpiCard icon={Wallet} label="Vendor Outstanding" value={fmt(summary.vendorOutstanding)} accent="gold" />
          <KpiCard icon={TrendingDown} label="Net Profit" value={fmt(summary.netProfit)} accent="brand" />
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-ink-100 dark:border-ink-700">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-ink-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Invoices" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 dark:bg-ink-900/40 text-left text-xs uppercase text-ink-500 dark:text-ink-300">
              <th className="px-4 py-3">Invoice #</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-ink-50 dark:border-ink-700/60 last:border-0">
                  <td className="px-4 py-3">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{clientName(inv.clientId)}</td>
                  <td className="px-4 py-3">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3">{inv.dueDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">{inv.status !== "Paid" && <button className="btn-ghost !px-2 !py-1" onClick={() => markInvoicePaid(inv)}>Mark Paid</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Vendor Payments" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 dark:bg-ink-900/40 text-left text-xs uppercase text-ink-500 dark:text-ink-300">
              <th className="px-4 py-3">Reference</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {vendorPayments.map((p) => (
                <tr key={p.id} className="border-b border-ink-50 dark:border-ink-700/60 last:border-0">
                  <td className="px-4 py-3">{p.invoiceRef}</td>
                  <td className="px-4 py-3">{vendorName(p.vendorId)}</td>
                  <td className="px-4 py-3">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">{p.dueDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">{p.status !== "Paid" && <button className="btn-ghost !px-2 !py-1" onClick={() => markPaymentPaid(p)}>Mark Paid</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Expenses" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 dark:bg-ink-900/40 text-left text-xs uppercase text-ink-500 dark:text-ink-300">
              <th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Noted By</th>
            </tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-ink-50 dark:border-ink-700/60 last:border-0">
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3">{fmt(e.amount)}</td>
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">{e.notedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={`New ${tab === "Vendor Payments" ? "Vendor Payment" : tab === "Expenses" ? "Expense" : "Invoice"}`} footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="finance-form" type="submit">Save</button>
        </>
      }>
        <form id="finance-form" onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          {tab === "Invoices" && (
            <>
              <FormField label="Invoice Number" full><input className="input" required value={form.invoiceNumber || ""} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></FormField>
              <FormField label="Client">
                <select className="input" required value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.brandName}</option>)}
                </select>
              </FormField>
              <FormField label="Amount (₹)"><input className="input" type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
              <FormField label="Issue Date"><input className="input" type="date" value={form.issueDate || ""} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></FormField>
              <FormField label="Due Date"><input className="input" type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
            </>
          )}
          {tab === "Vendor Payments" && (
            <>
              <FormField label="Reference" full><input className="input" required value={form.invoiceRef || ""} onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })} /></FormField>
              <FormField label="Vendor">
                <select className="input" required value={form.vendorId || ""} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
                  <option value="">Select vendor</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                </select>
              </FormField>
              <FormField label="Amount (₹)"><input className="input" type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
              <FormField label="Due Date"><input className="input" type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
            </>
          )}
          {tab === "Expenses" && (
            <>
              <FormField label="Category" full><input className="input" required value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField>
              <FormField label="Amount (₹)"><input className="input" type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormField>
              <FormField label="Date"><input className="input" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
