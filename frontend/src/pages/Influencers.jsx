import { useEffect, useState } from "react";
import { Plus, Download, Bookmark, Instagram, Youtube, Upload, Megaphone, Star, Trash2, Sparkles } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CSVImportModal from "../components/CSVImportModal";
import CommentsPanel from "../components/CommentsPanel";
import EditHistoryPanel from "../components/EditHistoryPanel";
import MaskedField from "../components/MaskedField";
import { usePermissions } from "../context/PermissionsContext";

const CATEGORIES = ["Beauty", "Fashion", "Fitness", "Tech", "Food", "Travel", "Comedy", "Lifestyle", "Gaming", "Finance"];
const TIERS = ["Nano", "Micro", "Macro", "Mega"];
const SHORTLIST_STATUSES = ["Shortlisted", "Approved", "Rejected", "On Hold"];

const EMPTY_FORM = {
  creatorName: "", instagramHandle: "", youtubeChannel: "", category: "Beauty", tier: "Micro",
  followers: "", averageViews: "", engagementRate: "", gender: "Female", location: "", language: "English",
  contactNumber: "", email: "", managerDetails: "", commercialCost: "",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtFollowers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n;
}

// ─── Campaign Shortlist Panel ───────────────────────────────────────────────
function CampaignShortlistPanel({ influencer, campaigns }) {
  const [shortlists, setShortlists] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Find which campaigns this influencer is already shortlisted in
  async function loadShortlists() {
    // Fetch shortlists for all campaigns and filter by influencer
    const results = [];
    for (const c of campaigns) {
      try {
        const res = await api.get(`/influencers/campaign-shortlist/${c.id}`);
        const entries = res.data?.data || [];
        const match = entries.find((e) => e.influencerId === influencer.id);
        if (match) results.push({ ...match, campaignName: c.campaignName });
      } catch (_) {}
    }
    setShortlists(results);
  }

  useEffect(() => {
    if (influencer && campaigns.length > 0) loadShortlists();
  }, [influencer?.id, campaigns]);

  async function handleAdd() {
    if (!selectedCampaignId) return;
    setLoading(true);
    try {
      await api.post(`/influencers/campaign-shortlist/${selectedCampaignId}`, {
        influencerId: influencer.id,
        note,
      });
      setAdding(false);
      setSelectedCampaignId("");
      setNote("");
      loadShortlists();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add to shortlist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(shortlistId) {
    const entry = shortlists.find((s) => s.id === shortlistId);
    if (!entry) return;
    await api.delete(`/influencers/campaign-shortlist/${entry.campaignId}/${shortlistId}`);
    loadShortlists();
  }

  async function handleStatusChange(shortlistId, status) {
    const entry = shortlists.find((s) => s.id === shortlistId);
    if (!entry) return;
    await api.put(`/influencers/campaign-shortlist/${entry.campaignId}/${shortlistId}`, { status });
    loadShortlists();
  }

  const alreadyShortlistedIds = shortlists.map((s) => s.campaignId);
  const availableCampaigns = campaigns.filter((c) => !alreadyShortlistedIds.includes(c.id));

  const statusColor = (status) => {
    if (status === "Approved") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
    if (status === "Rejected") return "text-rose-600 bg-rose-50 dark:bg-rose-900/20";
    if (status === "On Hold") return "text-amber-600 bg-amber-50 dark:bg-amber-900/20";
    return "text-brand-600 bg-brand-50 dark:bg-brand-900/20";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="label">Campaign Shortlists</p>
        {availableCampaigns.length > 0 && !adding && (
          <button className="btn-secondary !py-1 !px-2.5 text-xs" onClick={() => setAdding(true)}>
            <Megaphone size={12} className="inline mr-1" /> Add to Campaign
          </button>
        )}
      </div>

      {adding && (
        <div className="card p-3 mb-3 space-y-2 bg-brand-50/40 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800">
          <select
            className="input text-sm"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
          >
            <option value="">Select campaign...</option>
            {availableCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.campaignName}</option>
            ))}
          </select>
          <input
            className="input text-sm"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1 justify-center text-xs !py-1.5" onClick={handleAdd} disabled={loading || !selectedCampaignId}>
              {loading ? "Adding..." : "Shortlist"}
            </button>
            <button className="btn-secondary flex-1 justify-center text-xs !py-1.5" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {shortlists.length === 0 && !adding && (
        <p className="text-xs text-ink-400">Not shortlisted for any campaign yet.</p>
      )}

      <div className="space-y-2">
        {shortlists.map((s) => (
          <div key={s.id} className="flex items-center gap-2 border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-xs">
            <Megaphone size={12} className="text-brand-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-800 dark:text-white truncate">{s.campaignName}</p>
              {s.note && <p className="text-ink-400 truncate">{s.note}</p>}
            </div>
            <select
              className="text-xs border border-ink-200 dark:border-ink-600 rounded px-1.5 py-0.5 bg-transparent"
              value={s.status}
              onChange={(e) => handleStatusChange(s.id, e.target.value)}
            >
              {SHORTLIST_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <button onClick={() => handleRemove(s.id)} className="text-rose-400 hover:text-rose-600 ml-1">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Campaign Shortlist View (Campaign-centric) ─────────────────────────────
function CampaignShortlistView({ campaigns }) {
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [shortlist, setShortlist] = useState([]);
  const [allInfluencers, setAllInfluencers] = useState([]);
  const [addingId, setAddingId] = useState("");
  const [addingNote, setAddingNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/influencers").then((r) => setAllInfluencers(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCampaign) loadShortlist();
  }, [selectedCampaign]);

  async function loadShortlist() {
    if (!selectedCampaign) return;
    const res = await api.get(`/influencers/campaign-shortlist/${selectedCampaign}`);
    setShortlist(res.data?.data || []);
  }

  async function handleAdd() {
    if (!addingId || !selectedCampaign) return;
    setLoading(true);
    try {
      await api.post(`/influencers/campaign-shortlist/${selectedCampaign}`, {
        influencerId: Number(addingId),
        note: addingNote,
      });
      setAddingId("");
      setAddingNote("");
      loadShortlist();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(s) {
    await api.delete(`/influencers/campaign-shortlist/${s.campaignId}/${s.id}`);
    loadShortlist();
  }

  async function updateStatus(s, status) {
    await api.put(`/influencers/campaign-shortlist/${s.campaignId}/${s.id}`, { status });
    loadShortlist();
  }

  const shortlistedIds = shortlist.map((s) => s.influencerId);
  const available = allInfluencers.filter((i) => !shortlistedIds.includes(i.id));

  const statusColor = (status) => {
    if (status === "Approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
    if (status === "Rejected") return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400";
    if (status === "On Hold") return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    return "bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400";
  };

  return (
    <div>
      <div className="card p-4 mb-4">
        <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-2">
          Select Campaign
        </label>
        <select
          className="input"
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
        >
          <option value="">— Choose a campaign —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.campaignName}</option>
          ))}
        </select>
      </div>

      {selectedCampaign && (
        <>
          {/* Add influencer */}
          <div className="card p-4 mb-4 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-40">
              <label className="label mb-1">Add Creator to Shortlist</label>
              <select className="input" value={addingId} onChange={(e) => setAddingId(e.target.value)}>
                <option value="">Select creator...</option>
                {available.map((i) => (
                  <option key={i.id} value={i.id}>{i.creatorName} ({i.tier})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="label mb-1">Note</label>
              <input className="input" placeholder="Optional note..." value={addingNote} onChange={(e) => setAddingNote(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={handleAdd} disabled={loading || !addingId}>
              <Plus size={15} /> {loading ? "Adding..." : "Shortlist"}
            </button>
          </div>

          {/* Shortlist table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-ink-100 dark:border-ink-700/60">
              <p className="font-semibold text-sm text-ink-800 dark:text-white">
                Shortlisted Creators ({shortlist.length})
              </p>
            </div>
            {shortlist.length === 0 ? (
              <p className="text-center text-ink-400 py-10 text-sm">No creators shortlisted for this campaign yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 dark:bg-ink-900/40 text-xs uppercase text-ink-500 dark:text-ink-300 text-left">
                    <th className="px-4 py-2.5">Creator</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Tier</th>
                    <th className="px-4 py-2.5">Followers</th>
                    <th className="px-4 py-2.5">Cost</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Added By</th>
                    <th className="px-4 py-2.5">Note</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 dark:divide-ink-700/50">
                  {shortlist.map((s) => {
                    const inf = s.influencer;
                    return (
                      <tr key={s.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-ink-800 dark:text-white">
                          {inf?.creatorName || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                            {inf?.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-500">{inf?.tier || "—"}</td>
                        <td className="px-4 py-2.5 text-ink-500">{fmtFollowers(inf?.followers || 0)}</td>
                        <td className="px-4 py-2.5 text-ink-500">
                          ₹{Number(inf?.commercialCost || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${statusColor(s.status)}`}
                            value={s.status}
                            onChange={(e) => updateStatus(s, e.target.value)}
                          >
                            {SHORTLIST_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-ink-400 text-xs">{s.addedBy || "—"}</td>
                        <td className="px-4 py-2.5 text-ink-400 text-xs max-w-[160px] truncate">{s.note || "—"}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleRemove(s)} className="text-rose-400 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Influencers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("database"); // "database" | "shortlist"
  const [influencers, setInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // for assignment dropdown
  const [filters, setFilters] = useState({ category: "", tier: "", city: "", minFollowers: "", minEngagement: "", maxBudget: "", ownerId: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);

  const { can, canExportCSV, isSuperAdmin } = usePermissions();
  const canCreate = can("influencers", "create") || user?.role === "Employee"; // Employees can add their own
  const canDelete = can("influencers", "delete");
  const canExport = canExportCSV("influencers");
  const isEmployee = user?.role === "Employee";

  function load() {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api.get("/influencers", { params })
      .then((res) => setInfluencers(res.data?.data || []))
      .catch(() => setInfluencers([]));
  }

  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, [filters]);

  useEffect(() => {
    api.get("/campaigns").then((r) => setCampaigns(r.data?.data || [])).catch(() => {});
    if (user?.role === "Super Admin" || user?.role === "Manager") {
      api.get("/auth/users").then((r) => setAllUsers(r.data?.data || [])).catch(() => {});
    }
  }, [user?.role]);

  async function createInfluencer(e) {
    e.preventDefault();
    await api.post("/influencers", {
      ...form,
      followers: Number(form.followers) || 0,
      averageViews: Number(form.averageViews) || 0,
      engagementRate: Number(form.engagementRate) || 0,
      commercialCost: Number(form.commercialCost) || 0,
    });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this creator?")) return;
    try {
      await api.delete(`/influencers/${id}`);
      setSelected(null);
      load();
    } catch (err) {
      console.error("Error deleting creator:", err);
      alert("Failed to delete creator.");
    }
  }

  function exportCSV() {
    const headers = ["creatorName", "instagramHandle", "category", "tier", "followers", "engagementRate", "location", "commercialCost"];
    const rows = [headers.join(",")].concat(
      influencers.map((i) => headers.map((h) => `"${String(i[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-influencer-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Influencer Database"
        subtitle={isEmployee ? `Your ${influencers.length} creators` : `${influencers.length} creators in your network`}
        actions={
          <>
            {canExport && activeTab === "database" && (
              <button className="btn-secondary" onClick={exportCSV}>
                <Download size={15} /> Export CSV
              </button>
            )}
            {canCreate && activeTab === "database" && (
              <button className="btn-secondary" onClick={() => setShowImport(true)}>
                <Upload size={15} /> Import CSV
              </button>
            )}
            {canCreate && activeTab === "database" && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Add Creator
              </button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-ink-100 dark:border-ink-700/60">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "database"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-200"
          }`}
          onClick={() => setActiveTab("database")}
        >
          <Sparkles size={14} className="inline mr-1.5" />
          Creator Database
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "shortlist"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-200"
          }`}
          onClick={() => setActiveTab("shortlist")}
        >
          <Megaphone size={14} className="inline mr-1.5" />
          Campaign Shortlists
        </button>
      </div>

      {activeTab === "database" && (
        <>
          {showImport && (
            <CSVImportModal
              onClose={() => setShowImport(false)}
              onSuccess={() => { setShowImport(false); load(); }}
            />
          )}

          <div className="card p-4 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <select className="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="input" value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })}>
                <option value="">All Tiers</option>
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input className="input" placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
              <input className="input" type="number" placeholder="Min Followers" value={filters.minFollowers} onChange={(e) => setFilters({ ...filters, minFollowers: e.target.value })} />
              <input className="input" type="number" placeholder="Min Engagement %" value={filters.minEngagement} onChange={(e) => setFilters({ ...filters, minEngagement: e.target.value })} />
              <input className="input" type="number" placeholder="Max Budget (₹)" value={filters.maxBudget} onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })} />
              {!isEmployee && (
                <select className="input" value={filters.ownerId} onChange={(e) => setFilters({ ...filters, ownerId: e.target.value })}>
                  <option value="">All Employees</option>
                  <option value="unassigned">Unassigned Only</option>
                  {allUsers.filter((u) => u.role === "Employee").map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(influencers || []).filter(inf => inf && inf.id).map((inf) => (
              <button key={inf.id} onClick={() => setSelected(inf)} className="card p-4 text-left hover:-translate-y-0.5 hover:shadow-popover transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center font-display font-bold">
                    {inf.creatorName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800 dark:text-white truncate">{inf.creatorName || "Unnamed Creator"}</p>
                    <p className="text-xs text-ink-400">{inf.location || "—"} &middot; {inf.language || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">{inf.category || "—"}</span>
                  <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200">{inf.tier || "—"}</span>
                  {inf.createdBy && (
                    <span className="badge bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-400 text-[10px]">
                      {inf.createdBy.split(" ")[0]}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-ink-500 dark:text-ink-300">
                  <div><Instagram size={12} className="inline mr-1" />{fmtFollowers(inf.followers || 0)} followers</div>
                  <div>Avg Views: {fmtFollowers(inf.averageViews || 0)}</div>
                  <div>Engagement {inf.engagementRate || 0}%</div>
                  <div className="font-semibold text-ink-700 dark:text-ink-100">₹{Number(inf.commercialCost || 0).toLocaleString("en-IN")}</div>
                  <div className="col-span-2 text-[10px] text-ink-400">Added {fmtDate(inf.createdAt)} by {inf.createdBy || "System"}</div>
                </div>
              </button>
            ))}
            {(influencers || []).length === 0 && <p className="text-ink-400 col-span-full text-center py-10">No creators match your filters.</p>}
          </div>
        </>
      )}

      {activeTab === "shortlist" && (
        <CampaignShortlistView campaigns={campaigns} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Creator" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="influencer-form" type="submit">Add Creator</button>
        </>
      }>
        <form id="influencer-form" onSubmit={createInfluencer} className="grid grid-cols-2 gap-4">
          <FormField label="Creator Name" full><input className="input" required value={form.creatorName} onChange={(e) => setForm({ ...form, creatorName: e.target.value })} /></FormField>
          <FormField label="Instagram Handle"><input className="input" value={form.instagramHandle} onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })} /></FormField>
          <FormField label="YouTube Channel"><input className="input" value={form.youtubeChannel} onChange={(e) => setForm({ ...form, youtubeChannel: e.target.value })} /></FormField>
          <FormField label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </FormField>
          <FormField label="Tier">
            <select className="input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
          </FormField>
          <FormField label="Followers"><input className="input" type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} /></FormField>
          <FormField label="Average Views"><input className="input" type="number" placeholder="Avg views per post" value={form.averageViews} onChange={(e) => setForm({ ...form, averageViews: e.target.value })} /></FormField>
          <FormField label="Engagement Rate (%)"><input className="input" type="number" value={form.engagementRate} onChange={(e) => setForm({ ...form, engagementRate: e.target.value })} /></FormField>
          <FormField label="Location"><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
          <FormField label="Language"><input className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></FormField>
          <FormField label="Commercial Cost (₹)"><input className="input" type="number" value={form.commercialCost} onChange={(e) => setForm({ ...form, commercialCost: e.target.value })} /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Contact Number"><input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></FormField>
          {(user?.role === "Super Admin" || user?.role === "Manager") && allUsers.length > 0 && (
            <FormField label="Assign to Employee" full>
              <select
                className="input"
                value={form.ownerId || ""}
                onChange={(e) => {
                  const picked = allUsers.find((u) => String(u.id) === e.target.value);
                  setForm({ ...form, ownerId: picked?.id || null, ownerName: picked?.name || "" });
                }}
              >
                <option value="">Unassigned (visible to all managers)</option>
                {allUsers.filter((u) => u.role === "Employee").map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.team || "No Team"})</option>
                ))}
              </select>
            </FormField>
          )}
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.creatorName} subtitle={`${selected?.category} · ${selected?.tier}`}>
        {selected && (
          <div className="space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Instagram size={11} /> {selected.instagramHandle}</span>
            {selected.youtubeChannel && <span className="badge bg-rose-50 text-rose-600 dark:bg-rose-500/10"><Youtube size={11} /> {selected.youtubeChannel}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 rounded-full px-2.5 py-0.5 font-medium">
              Added {fmtDate(selected.createdAt)} by {selected.createdBy || "System"}
            </span>
            {selected.ownerName && (
              <span className="text-[11px] bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 rounded-full px-2.5 py-0.5 font-medium">
                Assigned to: {selected.ownerName}
              </span>
            )}
          </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Followers</p><p className="text-ink-800 dark:text-white">{Number(selected.followers).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Average Views</p><p className="text-ink-800 dark:text-white">{Number(selected.averageViews || 0).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Engagement Rate</p><p className="text-ink-800 dark:text-white">{selected.engagementRate}%</p></div>
              <div><p className="label">Location</p><p className="text-ink-800 dark:text-white">{selected.location}</p></div>
              <div><p className="label">Language</p><p className="text-ink-800 dark:text-white">{selected.language}</p></div>
              <div><p className="label">Gender</p><p className="text-ink-800 dark:text-white">{selected.gender}</p></div>
              <div><p className="label">Manager</p><p className="text-ink-800 dark:text-white">{selected.managerDetails || "Self-managed"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email || "—"}</p></div>
              <div><p className="label">Contact</p><p className="text-ink-800 dark:text-white">{selected.contactNumber || "—"}</p></div>
            </div>
            <div>
              <p className="label mb-2">Rate Card</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="card p-3"><p className="text-ink-400 text-xs">Commercial</p><p className="font-semibold">₹{Number(selected.commercialCost).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Reel</p><p className="font-semibold">₹{Number(selected.reelCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Story</p><p className="font-semibold">₹{Number(selected.storyCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Ad Rights</p><p className="font-semibold">₹{Number(selected.adRightsCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Event Appearance</p><p className="font-semibold">₹{Number(selected.eventAppearanceCost || 0).toLocaleString("en-IN")}</p></div>
              </div>
            </div>
            {selected.previousBrandCollaborations && (
              <div>
                <p className="label mb-1">Previous Collaborations</p>
                <p className="text-sm text-ink-700 dark:text-ink-100">{selected.previousBrandCollaborations}</p>
              </div>
            )}
            {selected.portfolioLinks && (
              <a href={selected.portfolioLinks} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
                <Bookmark size={15} /> View Portfolio
              </a>
            )}
            <hr className="border-ink-100 dark:border-ink-700" />
            {/* Campaign Shortlist for this influencer */}
            <CampaignShortlistPanel influencer={selected} campaigns={campaigns} />
            <hr className="border-ink-100 dark:border-ink-700" />
            <CommentsPanel entityType="influencer" entityId={selected?.id} />
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
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded w-full mt-4 transition-colors"
              >
                Delete Creator
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
