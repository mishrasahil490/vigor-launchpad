import { useEffect, useState } from "react";
import { Plus, Download, Upload, Star, Trash2 } from "lucide-react";
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
import { usePermissions } from "../context/PermissionsContext";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUSES = ["Planning", "Active", "In Progress", "Content Approval", "Live", "Completed", "Cancelled"];
const TYPES = ["Product Launch", "Brand Awareness", "Festive Sale", "App Install", "UGC Drive"];

const EMPTY_FORM = { campaignName: "", clientId: "", campaignType: "Product Launch", startDate: "", endDate: "", budget: "", status: "Planning" };

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [shortlistAddId, setShortlistAddId] = useState("");
  const [shortlistNote, setShortlistNote] = useState("");
  const [drawerTab, setDrawerTab] = useState("overview"); // "overview" | "shortlist"

  const { can, canExportCSV } = usePermissions();
  const canCreate = can("campaigns", "create");
  const canEdit = can("campaigns", "edit");
  const canDelete = can("campaigns", "delete");
  const canExport = canExportCSV("campaigns");

  function load() {
    api.get("/campaigns").then((res) => setCampaigns(res.data?.data || [])).catch(() => setCampaigns([]));
  }
  useEffect(() => {
    load();
    api.get("/clients").then((res) => setClients(res.data?.data || [])).catch(() => setClients([]));
    api.get("/influencers").then((res) => setInfluencers(res.data?.data || [])).catch(() => setInfluencers([]));

    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openCampaign(c) {
    setSelectedId(c.id);
    setDrawerTab("overview");
    api.get(`/campaigns/${c.id}`).then((res) => setDetail(res.data?.data || [])).catch(() => setDetail([]));
    api.get(`/campaigns/${c.id}/profitability`).then((res) => setProfitability(res.data?.data || [])).catch(() => setProfitability([]));
    api.get(`/influencers/campaign-shortlist/${c.id}`).then((res) => setShortlist(res.data?.data || [])).catch(() => setShortlist([]));
  }

  async function loadShortlist(campaignId) {
    const res = await api.get(`/influencers/campaign-shortlist/${campaignId || selectedId}`);
    setShortlist(res.data?.data || []);
  }

  async function addToShortlist() {
    if (!shortlistAddId || !selectedId) return;
    try {
      await api.post(`/influencers/campaign-shortlist/${selectedId}`, {
        influencerId: Number(shortlistAddId),
        note: shortlistNote,
      });
      setShortlistAddId("");
      setShortlistNote("");
      loadShortlist(selectedId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add to shortlist.");
    }
  }

  async function removeFromShortlist(s) {
    await api.delete(`/influencers/campaign-shortlist/${s.campaignId}/${s.id}`);
    loadShortlist(selectedId);
  }

  async function updateShortlistStatus(s, status) {
    await api.put(`/influencers/campaign-shortlist/${s.campaignId}/${s.id}`, { status });
    loadShortlist(selectedId);
  }


  async function createCampaign(e) {
    e.preventDefault();
    await api.post("/campaigns", {
      ...form,
      clientId: Number(form.clientId),
      budget: Number(form.budget) || 0,
      campaignManager: user.name,
      campaignManagerId: user.id,
    });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await api.delete(`/campaigns/${id}`);
      setSelectedId(null);
      load();
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Failed to delete campaign.");
    }
  }

  function exportCSV() {
    const headers = ["campaignName", "clientId", "campaignType", "startDate", "endDate", "budget", "status"];
    const rows = [headers.join(",")].concat(
      campaigns.map((c) => headers.map((h) => `"${String(c[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-campaigns-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function updateStatus(status) {
    await api.put(`/campaigns/${selectedId}`, { status });
    setDetail((d) => ({ ...d, status }));
    load();
  }

  function clientName(id) {
    return clients.find((c) => c.id === id)?.brandName || "—";
  }
  function influencerName(id) {
    return influencers.find((i) => i.id === id)?.creatorName || "—";
  }

  const columns = [
    { key: "campaignName", label: "Campaign" },
    { key: "campaignType", label: "Type" },
    { key: "campaignManager", label: "Manager" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "budget", label: "Budget", render: (r) => `₹${Number(r.budget).toLocaleString("en-IN")}` },
    { key: "createdAt", label: "Date Added", render: (r) => <span className="text-xs text-ink-400">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Plan, execute, and track influencer marketing campaigns."
        actions={
          <>
            {canExport && <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>}
            {canCreate && <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>}
            {canCreate && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Campaign</button>
            )}
          </>
        }
      />

      <DataTable columns={columns} rows={campaigns} onRowClick={openCampaign} searchPlaceholder="Search campaigns..." />

      {showImport && (
        <CSVImportModal
          moduleType="campaigns"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Campaign" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="campaign-form" type="submit">Create Campaign</button>
        </>
      }>
        <form id="campaign-form" onSubmit={createCampaign} className="grid grid-cols-2 gap-4">
          <FormField label="Campaign Name" full><input className="input" required value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} /></FormField>
          <FormField label="Client">
            <select className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.brandName}</option>)}
            </select>
          </FormField>
          <FormField label="Campaign Type">
            <select className="input" value={form.campaignType} onChange={(e) => setForm({ ...form, campaignType: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </FormField>
          <FormField label="Start Date"><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></FormField>
          <FormField label="End Date"><input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></FormField>
          <FormField label="Budget (₹)" full><input className="input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></FormField>
        </form>
      </Modal>

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title={detail?.campaignName} subtitle={clientName(detail?.clientId)} width="max-w-2xl">
        {detail && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 rounded-full px-2.5 py-0.5 font-medium">
                Added {fmtDate(detail.createdAt)}{detail.createdBy ? ` by ${detail.createdBy}` : ""}
              </span>
              <StatusBadge status={detail.status} />
            </div>

            {/* Drawer Tabs */}
            <div className="flex gap-1 border-b border-ink-100 dark:border-ink-700/60">
              {["overview", "shortlist"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px capitalize ${
                    drawerTab === tab
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-ink-400 hover:text-ink-600"
                  }`}
                >
                  {tab === "shortlist" ? `Creator Shortlist (${shortlist.length})` : tab}
                </button>
              ))}
            </div>

            {drawerTab === "overview" && (
              <>
                <div>
                  <p className="label mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => updateStatus(s)} className={`badge border ${detail.status === s ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-600"}`}>{s}</button>
                    ))}
                  </div>
                </div>

                {profitability && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="card p-3"><p className="text-xs text-ink-400">Budget</p><p className="font-semibold">₹{Number(profitability.budget).toLocaleString("en-IN")}</p></div>
                    <div className="card p-3"><p className="text-xs text-ink-400">Profit</p><p className={`font-semibold ${profitability.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{Number(profitability.profit).toLocaleString("en-IN")}</p></div>
                  </div>
                )}

                <hr className="border-ink-100 dark:border-ink-700" />
                <CommentsPanel entityType="campaign" entityId={selectedId} />
              </>
            )}

            {drawerTab === "shortlist" && (
              <div className="space-y-4">
                {/* Add to shortlist */}
                <div className="card p-4 flex gap-2 flex-wrap items-end">
                  <div className="flex-1 min-w-40">
                    <label className="label mb-1">Add Creator</label>
                    <select className="input" value={shortlistAddId} onChange={(e) => setShortlistAddId(e.target.value)}>
                      <option value="">Select creator...</option>
                      {influencers.filter((i) => !shortlist.some((s) => s.influencerId === i.id)).map((i) => (
                        <option key={i.id} value={i.id}>{i.creatorName} ({i.tier})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-40">
                    <label className="label mb-1">Note</label>
                    <input className="input" placeholder="Optional note..." value={shortlistNote} onChange={(e) => setShortlistNote(e.target.value)} />
                  </div>
                  <button className="btn-primary" onClick={addToShortlist} disabled={!shortlistAddId}>
                    <Star size={14} /> Shortlist
                  </button>
                </div>

                {/* Shortlist table */}
                {shortlist.length === 0 ? (
                  <p className="text-center text-ink-400 py-8 text-sm">No creators shortlisted for this campaign yet.</p>
                ) : (
                  <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-ink-50 dark:bg-ink-900/40 text-xs uppercase text-ink-500 text-left">
                          <th className="px-3 py-2">Creator</th>
                          <th className="px-3 py-2">Tier</th>
                          <th className="px-3 py-2">Cost</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Added By</th>
                          <th className="px-3 py-2">Note</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50 dark:divide-ink-700/50">
                        {shortlist.map((s) => {
                          const inf = s.influencer;
                          return (
                            <tr key={s.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                              <td className="px-3 py-2 font-medium text-ink-800 dark:text-white">{inf?.creatorName || "—"}</td>
                              <td className="px-3 py-2">
                                <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200">{inf?.tier || "—"}</span>
                              </td>
                              <td className="px-3 py-2 text-ink-500">₹{Number(inf?.commercialCost || 0).toLocaleString("en-IN")}</td>
                              <td className="px-3 py-2">
                                <select
                                  className="text-xs border border-ink-200 dark:border-ink-600 rounded px-1.5 py-0.5 bg-transparent"
                                  value={s.status}
                                  onChange={(e) => updateShortlistStatus(s, e.target.value)}
                                >
                                  {["Shortlisted", "Approved", "Rejected", "On Hold"].map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-ink-400 text-xs">{s.addedBy || "—"}</td>
                              <td className="px-3 py-2 text-ink-400 text-xs max-w-[100px] truncate">{s.note || "—"}</td>
                              <td className="px-3 py-2">
                                <button onClick={() => removeFromShortlist(s)} className="text-rose-400 hover:text-rose-600">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {canDelete && (
              <button
                onClick={() => handleDelete(selectedId)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded w-full mt-6 transition-colors"
              >
                Delete Campaign
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
