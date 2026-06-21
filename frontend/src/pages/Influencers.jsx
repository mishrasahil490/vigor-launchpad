import { useEffect, useState } from "react";
import { Plus, Download, Bookmark, Instagram, Youtube } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";

const CATEGORIES = ["Beauty", "Fashion", "Fitness", "Tech", "Food", "Travel", "Comedy", "Lifestyle", "Gaming", "Finance"];
const TIERS = ["Nano", "Micro", "Macro", "Mega"];

const EMPTY_FORM = {
  creatorName: "", instagramHandle: "", youtubeChannel: "", category: "Beauty", tier: "Micro",
  followers: "", engagementRate: "", gender: "Female", location: "", language: "English",
  contactNumber: "", email: "", managerDetails: "", commercialCost: "",
};

function fmtFollowers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n;
}

export default function Influencers() {
  const { user } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [filters, setFilters] = useState({ category: "", tier: "", city: "", minFollowers: "", minEngagement: "", maxBudget: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);

  const canWrite = user.role === "Super Admin" || user.role === "Manager";

  function load() {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api.get("/influencers", { params }).then((res) => setInfluencers(res.data.data));
  }

  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, [filters]);

  async function createInfluencer(e) {
    e.preventDefault();
    await api.post("/influencers", {
      ...form,
      followers: Number(form.followers) || 0,
      engagementRate: Number(form.engagementRate) || 0,
      commercialCost: Number(form.commercialCost) || 0,
    });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
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
        subtitle={`${influencers.length} creators in your network`}
        actions={
          <>
            <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>
            {canWrite && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Creator</button>}
          </>
        }
      />

      <div className="card p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {influencers.map((inf) => (
          <button key={inf.id} onClick={() => setSelected(inf)} className="card p-4 text-left hover:-translate-y-0.5 hover:shadow-popover transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center font-display font-bold">
                {inf.creatorName[0]}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-800 dark:text-white truncate">{inf.creatorName}</p>
                <p className="text-xs text-ink-400">{inf.location} &middot; {inf.language}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">{inf.category}</span>
              <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200">{inf.tier}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-ink-500 dark:text-ink-300">
              <div><Instagram size={12} className="inline mr-1" />{fmtFollowers(inf.followers)} followers</div>
              <div>Engagement {inf.engagementRate}%</div>
              <div className="col-span-2 font-semibold text-ink-700 dark:text-ink-100">₹{Number(inf.commercialCost).toLocaleString("en-IN")} / deliverable</div>
            </div>
          </button>
        ))}
        {influencers.length === 0 && <p className="text-ink-400 col-span-full text-center py-10">No creators match your filters.</p>}
      </div>

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
          <FormField label="Engagement Rate (%)"><input className="input" type="number" value={form.engagementRate} onChange={(e) => setForm({ ...form, engagementRate: e.target.value })} /></FormField>
          <FormField label="Location"><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
          <FormField label="Language"><input className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></FormField>
          <FormField label="Commercial Cost (₹)"><input className="input" type="number" value={form.commercialCost} onChange={(e) => setForm({ ...form, commercialCost: e.target.value })} /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Contact Number"><input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></FormField>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.creatorName} subtitle={`${selected?.category} · ${selected?.tier}`}>
        {selected && (
          <div className="space-y-5">
            <div className="flex gap-2">
              <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Instagram size={11} /> {selected.instagramHandle}</span>
              {selected.youtubeChannel && <span className="badge bg-rose-50 text-rose-600 dark:bg-rose-500/10"><Youtube size={11} /> {selected.youtubeChannel}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Followers</p><p className="text-ink-800 dark:text-white">{Number(selected.followers).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Engagement Rate</p><p className="text-ink-800 dark:text-white">{selected.engagementRate}%</p></div>
              <div><p className="label">Location</p><p className="text-ink-800 dark:text-white">{selected.location}</p></div>
              <div><p className="label">Language</p><p className="text-ink-800 dark:text-white">{selected.language}</p></div>
              <div><p className="label">Gender</p><p className="text-ink-800 dark:text-white">{selected.gender}</p></div>
              <div><p className="label">Manager</p><p className="text-ink-800 dark:text-white">{selected.managerDetails || "Self-managed"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email}</p></div>
              <div><p className="label">Contact</p><p className="text-ink-800 dark:text-white">{selected.contactNumber}</p></div>
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
          </div>
        )}
      </Drawer>
    </div>
  );
}
