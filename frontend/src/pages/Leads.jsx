import { useEffect, useState } from "react";
import { Plus, ArrowRightCircle } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";

const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "Referral", "Cold Outreach", "Inbound Email", "Event", "Social Media"];

const EMPTY_FORM = {
  leadName: "", companyName: "", contactPerson: "", email: "", phoneNumber: "",
  leadSource: "Website", industry: "", estimatedBudget: "", status: "New",
};

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [noteText, setNoteText] = useState("");

  const canWrite = user.role === "Super Admin" || user.role === "Manager";

  function load() {
    setLoading(true);
    api.get("/leads").then((res) => setLeads(res.data.data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openLead(lead) {
    setSelected(lead);
    api.get(`/leads/${lead.id}/activity`).then((res) => setActivity(res.data.data));
  }

  async function createLead(e) {
    e.preventDefault();
    await api.post("/leads", { ...form, ownerId: user.id, ownerName: user.name, estimatedBudget: Number(form.estimatedBudget) || 0 });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function updateStatus(lead, status) {
    await api.put(`/leads/${lead.id}`, { status });
    setSelected((s) => (s ? { ...s, status } : s));
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await api.post(`/leads/${selected.id}/activity`, { type: "Note", message: noteText });
    setNoteText("");
    api.get(`/leads/${selected.id}/activity`).then((res) => setActivity(res.data.data));
  }

  async function convertToClient() {
    await api.post(`/leads/${selected.id}/convert`, {});
    setSelected(null);
    load();
  }

  const columns = [
    { key: "leadName", label: "Lead" },
    { key: "companyName", label: "Company" },
    { key: "industry", label: "Industry" },
    { key: "leadSource", label: "Source" },
    { key: "estimatedBudget", label: "Budget", render: (r) => `₹${Number(r.estimatedBudget).toLocaleString("en-IN")}` },
    { key: "ownerName", label: "Owner" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Track and progress leads through the sales pipeline."
        actions={
          canWrite && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Lead
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        {STATUSES.map((s) => (
          <div key={s} className="card p-3 text-center">
            <p className="text-xs text-ink-400 mb-1">{s}</p>
            <p className="font-display font-bold text-lg text-ink-800 dark:text-white">
              {leads.filter((l) => l.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {!loading && <DataTable columns={columns} rows={leads} onRowClick={openLead} searchPlaceholder="Search leads..." />}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Lead" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="lead-form" type="submit">Create Lead</button>
        </>
      }>
        <form id="lead-form" onSubmit={createLead} className="grid grid-cols-2 gap-4">
          <FormField label="Lead Name" full>
            <input className="input" required value={form.leadName} onChange={(e) => setForm({ ...form, leadName: e.target.value })} />
          </FormField>
          <FormField label="Company Name">
            <input className="input" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </FormField>
          <FormField label="Contact Person">
            <input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Phone Number">
            <input className="input" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
          </FormField>
          <FormField label="Lead Source">
            <select className="input" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Industry">
            <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </FormField>
          <FormField label="Estimated Budget (₹)">
            <input className="input" type="number" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} />
          </FormField>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.leadName} subtitle={selected?.companyName}>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Contact</p><p className="text-ink-800 dark:text-white">{selected.contactPerson}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email}</p></div>
              <div><p className="label">Phone</p><p className="text-ink-800 dark:text-white">{selected.phoneNumber}</p></div>
              <div><p className="label">Industry</p><p className="text-ink-800 dark:text-white">{selected.industry}</p></div>
              <div><p className="label">Source</p><p className="text-ink-800 dark:text-white">{selected.leadSource}</p></div>
              <div><p className="label">Budget</p><p className="text-ink-800 dark:text-white">₹{Number(selected.estimatedBudget).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Owner</p><p className="text-ink-800 dark:text-white">{selected.ownerName}</p></div>
              <div><p className="label">Score</p><p className="text-ink-800 dark:text-white">{selected.score ?? "—"}</p></div>
            </div>

            <div>
              <p className="label mb-2">Pipeline Stage</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected, s)}
                    className={`badge border ${selected.status === s ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-600"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {selected.status === "Qualified" || selected.status === "Negotiation" || selected.status === "Won" ? (
              <button onClick={convertToClient} className="btn-secondary w-full justify-center">
                <ArrowRightCircle size={16} /> Convert to Client
              </button>
            ) : null}

            <div>
              <p className="label mb-2">Activity &amp; Notes</p>
              <form onSubmit={addNote} className="flex gap-2 mb-3">
                <input className="input" placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <button className="btn-secondary" type="submit">Add</button>
              </form>
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="border-l-2 border-brand-200 pl-3">
                    <p className="text-xs text-ink-400">{a.authorName} &middot; {new Date(a.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-ink-700 dark:text-ink-100">{a.message}</p>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-sm text-ink-400">No activity yet.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
