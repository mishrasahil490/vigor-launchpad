import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";

const STATUSES = ["Planning", "Active", "In Progress", "Content Approval", "Live", "Completed", "Cancelled"];
const TYPES = ["Product Launch", "Brand Awareness", "Festive Sale", "App Install", "UGC Drive"];

const EMPTY_FORM = { campaignName: "", clientId: "", campaignType: "Product Launch", startDate: "", endDate: "", budget: "", status: "Planning" };

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [assignInfluencerId, setAssignInfluencerId] = useState("");

  const canWrite = user.role === "Super Admin" || user.role === "Manager";

  function load() {
    api.get("/campaigns").then((res) => setCampaigns(res.data.data));
  }
  useEffect(() => {
    load();
    api.get("/clients").then((res) => setClients(res.data.data));
    api.get("/influencers").then((res) => setInfluencers(res.data.data));
  }, []);

  function openCampaign(c) {
    setSelectedId(c.id);
    api.get(`/campaigns/${c.id}`).then((res) => setDetail(res.data.data));
    api.get(`/campaigns/${c.id}/profitability`).then((res) => setProfitability(res.data.data));
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

  async function updateStatus(status) {
    await api.put(`/campaigns/${selectedId}`, { status });
    setDetail((d) => ({ ...d, status }));
    load();
  }

  async function assignInfluencer() {
    if (!assignInfluencerId) return;
    const inf = influencers.find((i) => i.id === Number(assignInfluencerId));
    await api.post(`/campaigns/${selectedId}/influencers`, { influencerId: inf.id, agreedCost: inf.commercialCost, deliverableType: "Reel" });
    setAssignInfluencerId("");
    const res = await api.get(`/campaigns/${selectedId}`);
    setDetail(res.data.data);
    const prof = await api.get(`/campaigns/${selectedId}/profitability`);
    setProfitability(prof.data.data);
  }

  function clientName(id) {
    return clients.find((c) => c.id === id)?.brandName || "—";
  }
  function influencerName(id) {
    return influencers.find((i) => i.id === id)?.creatorName || "—";
  }

  const columns = [
    { key: "campaignName", label: "Campaign" },
    { key: "clientId", label: "Client", render: (r) => clientName(r.clientId) },
    { key: "campaignType", label: "Type" },
    { key: "budget", label: "Budget", render: (r) => `₹${Number(r.budget).toLocaleString("en-IN")}` },
    { key: "spend", label: "Spend", render: (r) => `₹${Number(r.spend || 0).toLocaleString("en-IN")}` },
    { key: "campaignManager", label: "Manager" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Plan, execute, and track influencer marketing campaigns."
        actions={canWrite && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Campaign</button>
        )}
      />

      <DataTable columns={columns} rows={campaigns} onRowClick={openCampaign} searchPlaceholder="Search campaigns..." />

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
                <div className="card p-3"><p className="text-xs text-ink-400">Influencer Cost</p><p className="font-semibold">₹{Number(profitability.influencerCost).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-xs text-ink-400">Profit</p><p className={`font-semibold ${profitability.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{Number(profitability.profit).toLocaleString("en-IN")}</p></div>
              </div>
            )}

            <div>
              <p className="label mb-2">Assigned Influencers</p>
              <div className="flex gap-2 mb-3">
                <select className="input" value={assignInfluencerId} onChange={(e) => setAssignInfluencerId(e.target.value)}>
                  <option value="">Select influencer to assign...</option>
                  {influencers.map((i) => <option key={i.id} value={i.id}>{i.creatorName} ({i.tier})</option>)}
                </select>
                <button className="btn-secondary" onClick={assignInfluencer}>Assign</button>
              </div>
              <div className="space-y-2">
                {detail.assignments?.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink-700 dark:text-ink-100">{influencerName(a.influencerId)} &middot; {a.deliverableType}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={a.contentStatus} />
                      <span className="text-ink-400">₹{Number(a.agreedCost).toLocaleString("en-IN")}</span>
                    </span>
                  </div>
                ))}
                {(!detail.assignments || detail.assignments.length === 0) && <p className="text-sm text-ink-400">No influencers assigned yet.</p>}
              </div>
            </div>

            <div>
              <p className="label mb-2">Deliverables / Content Calendar</p>
              <div className="space-y-2">
                {detail.deliverables?.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink-700 dark:text-ink-100">{d.title} &middot; due {d.dueDate}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
                {(!detail.deliverables || detail.deliverables.length === 0) && <p className="text-sm text-ink-400">No deliverables logged yet.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
