import { useEffect, useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CSVImportModal from "../components/CSVImportModal";

const STATUSES = ["Planning", "Confirmed", "Completed", "Cancelled"];
const TYPES = ["Brand Activation", "Product Launch", "Influencer Meetup", "Award Night", "Pop-up Store"];

const EMPTY_FORM = { eventName: "", eventType: "Brand Activation", venue: "", date: "", clientId: "", budget: "", status: "Planning" };

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [vendorPick, setVendorPick] = useState("");
  const [vendorCost, setVendorCost] = useState("");

  const canWrite = user.role === "Super Admin" || user.role === "Manager";

  function load() {
    api.get("/events").then((res) => setEvents(res.data?.data || [])).catch(() => setEvents([]));
  }
  useEffect(() => {
    load();
    api.get("/clients").then((res) => setClients(res.data?.data || [])).catch(() => setClients([]));
    api.get("/vendors").then((res) => setVendors(res.data?.data || [])).catch(() => setVendors([]));
    api.get("/influencers").then((res) => setInfluencers(res.data?.data || [])).catch(() => setInfluencers([]));

    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openEvent(e) {
    setSelectedId(e.id);
    api.get(`/events/${e.id}`).then((res) => setDetail(res.data?.data || [])).catch(() => setDetail([]));
    api.get(`/events/${e.id}/profitability`).then((res) => setProfitability(res.data?.data || [])).catch(() => setProfitability([]));
  }

  async function refreshDetail() {
    const res = await api.get(`/events/${selectedId}`);
    setDetail(res.data?.data);
    const prof = await api.get(`/events/${selectedId}/profitability`);
    setProfitability(prof.data.data);
  }

  async function createEvent(e) {
    e.preventDefault();
    await api.post("/events", { ...form, clientId: Number(form.clientId), budget: Number(form.budget) || 0, eventManager: user.name, eventManagerId: user.id });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  function exportCSV() {
    const headers = ["eventName", "eventType", "venue", "date", "budget", "status", "description"];
    const rows = [headers.join(",")].concat(
      events.map((evt) => headers.map((h) => `"${String(evt[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-events-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function updateStatus(status) {
    await api.put(`/events/${selectedId}`, { status });
    setDetail((d) => ({ ...d, status }));
    load();
  }

  async function allocateVendor() {
    if (!vendorPick) return;
    await api.post(`/events/${selectedId}/vendors`, { vendorId: Number(vendorPick), cost: Number(vendorCost) || 0 });
    setVendorPick("");
    setVendorCost("");
    refreshDetail();
  }

  function clientName(id) { return clients.find((c) => c.id === id)?.brandName || "—"; }
  function vendorName(id) { return vendors.find((v) => v.id === id)?.vendorName || "—"; }
  function influencerName(id) { return influencers.find((i) => i.id === id)?.creatorName || "—"; }

  const columns = [
    { key: "eventName", label: "Event" },
    { key: "eventType", label: "Type" },
    { key: "venue", label: "Venue" },
    { key: "date", label: "Date" },
    { key: "budget", label: "Budget", render: (r) => `₹${Number(r.budget).toLocaleString("en-IN")}` },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Plan brand activations, launches, and influencer meetups end-to-end."
        actions={
          <>
            <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>
            {canWrite && <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>}
            {canWrite && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Event</button>
            )}
          </>
        }
      />

      <DataTable columns={columns} rows={events} onRowClick={openEvent} searchPlaceholder="Search events..." />

      {showImport && (
        <CSVImportModal
          moduleType="events"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Event" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="event-form" type="submit">Create Event</button>
        </>
      }>
        <form id="event-form" onSubmit={createEvent} className="grid grid-cols-2 gap-4">
          <FormField label="Event Name" full><input className="input" required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} /></FormField>
          <FormField label="Event Type">
            <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </FormField>
          <FormField label="Client">
            <select className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.brandName}</option>)}
            </select>
          </FormField>
          <FormField label="Venue" full><input className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></FormField>
          <FormField label="Date"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
          <FormField label="Budget (₹)"><input className="input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></FormField>
        </form>
      </Modal>

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title={detail?.eventName} subtitle={detail?.venue} width="max-w-2xl">
        {detail && (
          <div className="space-y-6">
            <div>
              <p className="label mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => updateStatus(s)} className={`badge border ${detail.status === s ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-600"}`}>{s}</button>
                ))}
              </div>
            </div>

            {profitability && (
              <div className="grid grid-cols-3 gap-2">
                <div className="card p-3"><p className="text-xs text-ink-400">Budget</p><p className="font-semibold">₹{Number(profitability.budget).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-xs text-ink-400">Total Cost</p><p className="font-semibold">₹{Number(profitability.totalCost).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-xs text-ink-400">Profit</p><p className={`font-semibold ${profitability.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{Number(profitability.profit).toLocaleString("en-IN")}</p></div>
              </div>
            )}

            <div>
              <p className="label mb-2">Vendor Allocation</p>
              <div className="flex gap-2 mb-3">
                <select className="input" value={vendorPick} onChange={(e) => setVendorPick(e.target.value)}>
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                </select>
                <input className="input w-32" type="number" placeholder="Cost ₹" value={vendorCost} onChange={(e) => setVendorCost(e.target.value)} />
                <button className="btn-secondary" onClick={allocateVendor}>Add</button>
              </div>
              <div className="space-y-2">
                {detail.vendors?.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink-700 dark:text-ink-100">{vendorName(v.vendorId)}</span>
                    <span className="flex items-center gap-2"><StatusBadge status={v.paymentStatus} /><span className="text-ink-400">₹{Number(v.cost).toLocaleString("en-IN")}</span></span>
                  </div>
                ))}
                {(!detail.vendors || detail.vendors.length === 0) && <p className="text-sm text-ink-400">No vendors allocated.</p>}
              </div>
            </div>

            <div>
              <p className="label mb-2">Influencer Attendance</p>
              <div className="space-y-2">
                {detail.attendance?.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink-700 dark:text-ink-100">{influencerName(a.influencerId)} &middot; {a.role}</span>
                    <StatusBadge status={a.attendanceStatus} />
                  </div>
                ))}
                {(!detail.attendance || detail.attendance.length === 0) && <p className="text-sm text-ink-400">No influencers invited yet.</p>}
              </div>
            </div>

            <div>
              <p className="label mb-2">Sponsors</p>
              <div className="space-y-2">
                {detail.sponsors?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink-700 dark:text-ink-100">{s.sponsorName}</span>
                    <span className="text-ink-400">₹{Number(s.sponsorshipValue).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {(!detail.sponsors || detail.sponsors.length === 0) && <p className="text-sm text-ink-400">No sponsors yet.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
