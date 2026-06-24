import { useEffect, useState } from "react";
import { Plus, ArrowRightCircle, Download, Upload, Linkedin } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CSVImportModal from "../components/CSVImportModal";
import CommentsPanel from "../components/CommentsPanel";
import EditHistoryPanel from "../components/EditHistoryPanel";
import { usePermissions } from "../context/PermissionsContext";

import { maskEmail, maskPhone } from "../components/MaskedField";

const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "Referral", "Cold Outreach", "Inbound Email", "Event", "Social Media"];
const BRAND_TYPES = ["D2C", "FMCG", "Fashion", "Tech", "F&B", "Beauty", "Healthcare", "Education", "Finance", "Other"];
const CATEGORIES = ["Brand Activation", "Influencer Marketing", "Event", "Digital Campaign", "PR", "Performance Marketing", "Other"];

const EMPTY_FORM = {
  leadName: "", category: "", groupName: "", brandType: "", brandName: "",
  pocName: "", designation: "", linkedInProfile: "", email: "", contactNumber: "",
  leadSource: "Website", industry: "", estimatedBudget: "", status: "New",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [noteText, setNoteText] = useState("");

  const { can, canExportCSV } = usePermissions();
  const canCreate = can("leads", "create");
  const canEdit = can("leads", "edit");
  const canDelete = can("leads", "delete");
  const canExport = canExportCSV("leads");

  function load() {
    setLoading(true);
    api.get("/leads").then((res) => setLeads(res.data?.data || [])).catch(() => setLeads([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openLead(lead) {
    setSelected(lead);
    api.get(`/leads/${lead.id}/activity`).then((res) => setActivity(res.data?.data || [])).catch(() => setActivity([]));
  }

  async function createLead(e) {
    e.preventDefault();
    await api.post("/leads", { ...form, ownerId: user.id, ownerName: user.name, estimatedBudget: Number(form.estimatedBudget) || 0 });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      setSelected(null);
      load();
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert("Failed to delete lead.");
    }
  }

  function exportCSV() {
    const headers = ["leadName", "category", "groupName", "brandType", "brandName", "pocName", "designation", "email", "contactNumber", "linkedInProfile", "leadSource", "estimatedBudget", "status", "createdAt"];
    const rows = [headers.join(",")].concat(
      leads.map((l) => headers.map((h) => `"${String(l[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-leads-list.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    api.get(`/leads/${selected.id}/activity`).then((res) => setActivity(res.data?.data || [])).catch(() => setActivity([]));
  }

  async function convertToClient() {
    await api.post(`/leads/${selected.id}/convert`, {});
    setSelected(null);
    load();
  }

  const columns = [
    { key: "brandName", label: "Brand Name" },
    { key: "pocName", label: "POC Name" },
    { key: "category", label: "Category" },
    { key: "brandType", label: "Brand Type" },
    { key: "email", label: "Email", render: (r) => maskEmail(r.email) },
    { key: "contactNumber", label: "Contact", render: (r) => maskPhone(r.contactNumber) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdBy", label: "Added By", render: (r) => <span className="text-xs text-ink-500">{r.createdBy || "System"}</span> },
    { key: "createdAt", label: "Date Added", render: (r) => <span className="text-xs text-ink-400">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Track and progress leads through the sales pipeline."
        actions={
          <>
            {canExport && <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>}
            {canCreate && <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>}
            {canCreate && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> New Lead
              </button>
            )}
          </>
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

      {showImport && (
        <CSVImportModal
          moduleType="leads"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

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
          <FormField label="Brand Name">
            <input className="input" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </FormField>
          <FormField label="POC Name">
            <input className="input" value={form.pocName} onChange={(e) => setForm({ ...form, pocName: e.target.value })} />
          </FormField>
          <FormField label="Designation">
            <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </FormField>
          <FormField label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Brand Type">
            <select className="input" value={form.brandType} onChange={(e) => setForm({ ...form, brandType: e.target.value })}>
              <option value="">Select type...</option>
              {BRAND_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Group Name">
            <input className="input" value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Contact Number">
            <input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </FormField>
          <FormField label="LinkedIn Profile" full>
            <input className="input" placeholder="https://linkedin.com/in/..." value={form.linkedInProfile} onChange={(e) => setForm({ ...form, linkedInProfile: e.target.value })} />
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.brandName || selected?.leadName} subtitle={selected?.category}>
        {selected && (
          <div className="space-y-6">
            {/* Date Added badge */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 rounded-full px-2.5 py-0.5 font-medium">
                Added {fmtDate(selected.createdAt)}
              </span>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">POC Name</p><p className="text-ink-800 dark:text-white">{selected.pocName || "—"}</p></div>
              <div><p className="label">Designation</p><p className="text-ink-800 dark:text-white">{selected.designation || "—"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email || "—"}</p></div>
              <div><p className="label">Contact Number</p><p className="text-ink-800 dark:text-white">{selected.contactNumber || selected.phoneNumber || "—"}</p></div>
              <div><p className="label">Category</p><p className="text-ink-800 dark:text-white">{selected.category || "—"}</p></div>
              <div><p className="label">Brand Type</p><p className="text-ink-800 dark:text-white">{selected.brandType || "—"}</p></div>
              <div><p className="label">Group Name</p><p className="text-ink-800 dark:text-white">{selected.groupName || "—"}</p></div>
              <div><p className="label">Brand Name</p><p className="text-ink-800 dark:text-white">{selected.brandName || "—"}</p></div>
              <div><p className="label">Industry</p><p className="text-ink-800 dark:text-white">{selected.industry || "—"}</p></div>
              <div><p className="label">Lead Source</p><p className="text-ink-800 dark:text-white">{selected.leadSource || "—"}</p></div>
              <div><p className="label">Budget</p><p className="text-ink-800 dark:text-white">₹{Number(selected.estimatedBudget || 0).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Owner</p><p className="text-ink-800 dark:text-white">{selected.ownerName || "—"}</p></div>
              <div><p className="label">Score</p><p className="text-ink-800 dark:text-white">{selected.score ?? "—"}</p></div>
            </div>

            {selected.linkedInProfile && (
              <a
                href={selected.linkedInProfile}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full justify-center"
              >
                <Linkedin size={15} /> View LinkedIn Profile
              </a>
            )}

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

            {canEdit && (selected.status === "Qualified" || selected.status === "Negotiation" || selected.status === "Won") ? (
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
            <hr className="border-ink-100 dark:border-ink-700" />
            <CommentsPanel entityType="lead" entityId={selected?.id} />
            <hr className="border-ink-100 dark:border-ink-700" />
            <EditHistoryPanel 
              createdBy={selected.createdBy} 
              createdAt={selected.createdAt} 
              updatedBy={selected.updatedBy} 
              updatedAt={selected.updatedAt} 
              history={selected.history} 
            />
            {canDelete && (
              <button
                onClick={() => handleDelete(selected.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded w-full mt-6 transition-colors"
              >
                Delete Lead
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
