import { useState, useEffect, useRef } from "react";
import {
  GraduationCap, MapPin, Users, Building2, ChevronRight, ChevronLeft,
  Plus, Search, Pencil, Trash2, Upload, X, CheckCircle2, Clock,
  Phone, Mail, Instagram, Linkedin, Download, AlertCircle, Filter,
  Globe2, BookOpen, Layers, ArrowLeft, Star, Youtube, Bookmark,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";
import api from "../api/client";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CommentsPanel from "../components/CommentsPanel";
import EditHistoryPanel from "../components/EditHistoryPanel";

const ZONE_CONFIG = {
  North: { gradient: "from-blue-600 to-blue-400", light: "bg-blue-50", badge: "bg-blue-100 text-blue-700", emoji: "🏔️", border: "border-blue-200" },
  South: { gradient: "from-emerald-600 to-teal-400", light: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", emoji: "🌴", border: "border-emerald-200" },
  East:  { gradient: "from-amber-500 to-orange-400", light: "bg-amber-50", badge: "bg-amber-100 text-amber-700", emoji: "🌅", border: "border-amber-200" },
  West:  { gradient: "from-purple-600 to-violet-400", light: "bg-purple-50", badge: "bg-purple-100 text-purple-700", emoji: "🌊", border: "border-purple-200" },
  Central: { gradient: "from-rose-500 to-pink-400", light: "bg-rose-50", badge: "bg-rose-100 text-rose-700", emoji: "🏛️", border: "border-rose-200" },
};

const COLLEGE_TYPES = ["Government", "Private", "Deemed", "Autonomous", "Affiliated"];
const STREAMS = ["Engineering", "Medical", "Arts", "Commerce", "Science", "Law", "Management", "Design", "Other"];
const NAAC_GRADES = ["A++", "A+", "A", "B++", "B+", "B", "C", "Not Accredited", "Others"];
const FEST_TYPES = ["Cultural", "Technical", "Sports", "Management", "Mixed", "Other"];

// ─── Influencer constants ─────────────────────────────────────────────────────
const INF_CATEGORIES = ["Beauty", "Fashion", "Fitness", "Tech", "Food", "Travel", "Comedy", "Lifestyle", "Gaming", "Finance"];
const INF_TIERS = ["Nano", "Micro", "Macro", "Mega"];
const EMPTY_INF_FORM = {
  creatorName: "", instagramHandle: "", youtubeChannel: "", category: "Beauty", tier: "Micro",
  followers: "", averageViews: "", engagementRate: "", gender: "Female", location: "", language: "English",
  contactNumber: "", email: "", managerDetails: "", commercialCost: "",
  reelCost: "", storyCost: "", adRightsCost: "", eventAppearanceCost: "",
  previousBrandCollaborations: "", portfolioLinks: "", ownerId: "",
};
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtNum(n) {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}
// Move phone/email/number columns to the end for better UX when table is scrollable
function reorderColumns(cols) {
  const LAST_KEYWORDS = ["phone", "email", "number", "contact", "mobile"];
  const isLast = (h) => LAST_KEYWORDS.some((kw) => h.toLowerCase().includes(kw));
  return [...cols.filter((c) => !isLast(c)), ...cols.filter((c) => isLast(c))];
}
const CATEGORIES = ["Tier 1", "Tier 2", "Tier 3"];

const EMPTY_COLLEGE = {
  collegeName: "", type: "", stream: "", category: "", naacGrade: "", naacGradeOther: "",
  mainFestName: "", festType: "", durationDays: "", usualPeriod: "",
  estimatedFootfall: "", source: "", verified: "No",
};

const EMPTY_POC = {
  name: "", designationRole: "", departmentFestName: "", phoneNumber: "",
  instagramLinkedin: "", emailId: "", source: "", verified: "No", dateAdded: "",
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-800 dark:text-ink-100">{value}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
      </div>
    </div>
  );
}

function CollegeModal({ open, onClose, cityId, zoneId, college, onSave }) {
  const [form, setForm] = useState(EMPTY_COLLEGE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(college ? { ...college } : EMPTY_COLLEGE);
  }, [college, open]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, cityId, zoneId };
      const url = college ? `/vigor-space/colleges/${college.id}` : `/vigor-space/colleges`;
      const method = college ? "put" : "post";
      const { data } = await api[method](url, payload);
      onSave(data.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-700">
          <h2 className="text-lg font-bold text-ink-800 dark:text-ink-100">
            {college ? "Edit College" : "Add College"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">College Name *</label>
            <input required className="input" value={form.collegeName} onChange={(e) => set("collegeName", e.target.value)} placeholder="e.g. IIT Madras" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Select type</option>
              {COLLEGE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stream</label>
            <select className="input" value={form.stream} onChange={(e) => set("stream", e.target.value)}>
              <option value="">Select stream</option>
              {STREAMS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">NAAC Grade</label>
            <select className="input" value={form.naacGrade} onChange={(e) => { set("naacGrade", e.target.value); if (e.target.value !== "Others") set("naacGradeOther", ""); }}>
              <option value="">Select grade</option>
              {NAAC_GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
            {form.naacGrade === "Others" && (
              <input
                className="input mt-2"
                placeholder="Specify NAAC grade or accreditation status…"
                value={form.naacGradeOther || ""}
                onChange={(e) => set("naacGradeOther", e.target.value)}
                autoFocus
              />
            )}
          </div>
          <div>
            <label className="label">Main Fest Name</label>
            <input className="input" value={form.mainFestName} onChange={(e) => set("mainFestName", e.target.value)} placeholder="e.g. Saarang" />
          </div>
          <div>
            <label className="label">Fest Type</label>
            <select className="input" value={form.festType} onChange={(e) => set("festType", e.target.value)}>
              <option value="">Select fest type</option>
              {FEST_TYPES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (Days)</label>
            <input className="input" value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} placeholder="e.g. 3" />
          </div>
          <div>
            <label className="label">Usual Period</label>
            <input className="input" value={form.usualPeriod} onChange={(e) => set("usualPeriod", e.target.value)} placeholder="e.g. January" />
          </div>
          <div>
            <label className="label">Est. Footfall</label>
            <input className="input" value={form.estimatedFootfall} onChange={(e) => set("estimatedFootfall", e.target.value)} placeholder="e.g. 5000" />
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. Website / Alumni" />
          </div>
          <div>
            <label className="label">Verified</label>
            <select className="input" value={form.verified} onChange={(e) => set("verified", e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : college ? "Save Changes" : "Add College"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PocModal({ open, onClose, collegeId, poc, onSave }) {
  const [form, setForm] = useState(EMPTY_POC);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(poc ? { ...poc } : { ...EMPTY_POC, dateAdded: new Date().toISOString().slice(0, 10) });
  }, [poc, open]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = poc ? `/vigor-space/pocs/${poc.id}` : `/vigor-space/colleges/${collegeId}/pocs`;
      const method = poc ? "put" : "post";
      const { data } = await api[method](url, form);
      onSave(data.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-700">
          <h2 className="text-lg font-bold text-ink-800 dark:text-ink-100">{poc ? "Edit POC" : "Add POC"}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input required className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label className="label">Designation / Role</label>
            <input className="input" value={form.designationRole} onChange={(e) => set("designationRole", e.target.value)} placeholder="e.g. Fest Head" />
          </div>
          <div>
            <label className="label">Department / Fest</label>
            <input className="input" value={form.departmentFestName} onChange={(e) => set("departmentFestName", e.target.value)} placeholder="e.g. Saarang" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" type="tel" value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="label">Email ID</label>
            <input className="input" type="email" value={form.emailId} onChange={(e) => set("emailId", e.target.value)} placeholder="poc@college.edu" />
          </div>
          <div className="col-span-2">
            <label className="label">Instagram / LinkedIn</label>
            <input className="input" value={form.instagramLinkedin} onChange={(e) => set("instagramLinkedin", e.target.value)} placeholder="@handle or profile link" />
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. LinkedIn / Cold Call" />
          </div>
          <div>
            <label className="label">Date Added</label>
            <input className="input" type="date" value={form.dateAdded} onChange={(e) => set("dateAdded", e.target.value)} />
          </div>
          <div>
            <label className="label">Verified</label>
            <select className="input" value={form.verified} onChange={(e) => set("verified", e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : poc ? "Save Changes" : "Add POC"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CollegeDrawer({ college, onClose, onEdit, onDelete, onAddPoc, onEditPoc, onDeletePoc, zoneConfig }) {
  if (!college) return null;
  const cfg = zoneConfig || ZONE_CONFIG.North;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white dark:bg-ink-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${cfg.gradient} p-6 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-tight">{college.collegeName}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {college.type && <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{college.type}</span>}
                {college.stream && <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{college.stream}</span>}
                {college.naacGrade && <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">NAAC {college.naacGrade}</span>}
                {college.verified === "Yes" && (
                  <span className="text-xs bg-green-400/30 border border-green-300/50 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-3">
              <button onClick={onEdit} className="btn-ghost text-white hover:bg-white/20 p-2"><Pencil size={15} /></button>
              <button onClick={onDelete} className="btn-ghost text-white hover:bg-red-400/30 p-2"><Trash2 size={15} /></button>
              <button onClick={onClose} className="btn-ghost text-white hover:bg-white/20 p-2"><X size={15} /></button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-5 border-b border-ink-100 dark:border-ink-700">
          {[
            { label: "Main Fest", value: college.mainFestName },
            { label: "Fest Type", value: college.festType },
            { label: "Duration", value: college.durationDays ? `${college.durationDays} days` : "" },
            { label: "Usual Period", value: college.usualPeriod },
            { label: "Est. Footfall", value: college.estimatedFootfall },
            { label: "Category", value: college.category },
            { label: "Source", value: college.source },
            { label: "Added By", value: college.createdBy },
          ]
            .filter((f) => f.value)
            .map((f) => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider">{f.label}</p>
                <p className="text-sm text-ink-700 dark:text-ink-200 font-medium">{f.value}</p>
              </div>
            ))}
        </div>

        {/* POCs */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink-700 dark:text-ink-200 flex items-center gap-2">
              <Users size={16} /> POC Directory ({college.pocs?.length || 0})
            </h3>
            <button onClick={onAddPoc} className="btn-primary text-xs py-1.5 px-3"><Plus size={13} /> Add POC</button>
          </div>

          {!college.pocs?.length ? (
            <div className="text-center py-10 text-ink-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No POCs added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {college.pocs.map((poc) => (
                <div key={poc.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink-800 dark:text-ink-100">{poc.name}</p>
                        {poc.verified === "Yes" && <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />}
                      </div>
                      {poc.designationRole && (
                        <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{poc.designationRole}{poc.departmentFestName ? ` · ${poc.departmentFestName}` : ""}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {poc.phoneNumber && (
                          <a href={`tel:${poc.phoneNumber}`} className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline">
                            <Phone size={11} /> {poc.phoneNumber}
                          </a>
                        )}
                        {poc.emailId && (
                          <a href={`mailto:${poc.emailId}`} className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline">
                            <Mail size={11} /> {poc.emailId}
                          </a>
                        )}
                        {poc.instagramLinkedin && (
                          <span className="text-xs text-ink-500 flex items-center gap-1">
                            <Instagram size={11} /> {poc.instagramLinkedin}
                          </span>
                        )}
                      </div>
                      {poc.dateAdded && (
                        <p className="text-[10px] text-ink-400 mt-1.5 flex items-center gap-1">
                          <Clock size={9} /> Added {poc.dateAdded}{poc.doneBy ? ` by ${poc.doneBy}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEditPoc(poc)} className="btn-ghost p-1.5 text-ink-400 hover:text-brand-600"><Pencil size={13} /></button>
                      <button onClick={() => onDeletePoc(poc)} className="btn-ghost p-1.5 text-ink-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ open, onClose, onImport }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const CSV_TEMPLATE = `zone,city,collegeName,type,stream,category,naacGrade,mainFestName,festType,durationDays,usualPeriod,estimatedFootfall,source,verified,pocName,designationRole,departmentFestName,phoneNumber,emailId,instagramLinkedin
South,Chennai,IIT Madras,Government,Engineering,Tier 1,A++,Saarang,Cultural,4,January,10000,Website,Yes,Rahul Sharma,Fest Head,Saarang,9876543210,rahul@iitm.ac.in,@rahul_saarang`;

  function parseCsv(text) {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
    });
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCsvText(ev.target.result); setPreview(parseCsv(ev.target.result).slice(0, 5)); };
    reader.readAsText(file);
  }

  function handleTextChange(text) { setCsvText(text); setPreview(parseCsv(text).slice(0, 5)); }

  async function handleImport() {
    const records = parseCsv(csvText);
    if (!records.length) return alert("No valid records found in CSV.");
    setImporting(true);
    setResult(null);
    try {
      const r = await onImport(records);
      setResult(r);
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-ink-700">
          <h2 className="text-lg font-bold text-ink-800 dark:text-ink-100 flex items-center gap-2"><Upload size={18} /> Bulk CSV Import</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 border ${result.errors?.length ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <p className="font-semibold text-ink-800">Import Complete</p>
                <p className="text-sm mt-1">✅ {result.collegesCreated} colleges created · ✅ {result.pocsCreated} POCs created</p>
                {result.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-amber-700 font-medium">⚠️ {result.errors.length} row(s) had errors:</p>
                    <ul className="text-xs mt-1 space-y-0.5">
                      {result.errors.map((e, i) => <li key={i} className="text-amber-600">Row {e.row}: {e.error}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="btn-primary">Done</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Upload CSV File or Paste Below</label>
                  <button
                    onClick={() => { const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "vigor_space_template.csv"; a.click(); }}
                    className="btn-ghost text-xs flex items-center gap-1"
                  >
                    <Download size={12} /> Download Template
                  </button>
                </div>
                <input type="file" accept=".csv" ref={fileRef} onChange={handleFile} className="hidden" />
                <button onClick={() => fileRef.current.click()} className="btn-secondary w-full mb-3 justify-center">
                  <Upload size={15} /> Choose CSV File
                </button>
                <textarea
                  className="input font-mono text-xs"
                  rows={8}
                  placeholder={CSV_TEMPLATE}
                  value={csvText}
                  onChange={(e) => handleTextChange(e.target.value)}
                />
              </div>

              {preview.length > 0 && (
                <div>
                  <p className="label mb-2">Preview (first {preview.length} rows)</p>
                  <div className="overflow-x-auto rounded-lg border border-ink-100 dark:border-ink-700">
                    <table className="text-xs w-full">
                      <thead className="bg-ink-50 dark:bg-ink-900">
                        {(() => {
                          const colOrder = reorderColumns(Object.keys(preview[0]));
                          return (
                            <>
                              <tr>{colOrder.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-ink-500 whitespace-nowrap">{h}</th>)}</tr>
                            </>
                          );
                        })()}
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-ink-100 dark:border-ink-700">
                             {(() => {
                               const colOrder = reorderColumns(Object.keys(row));
                               return colOrder.map((k, j) => <td key={j} className="px-3 py-2 text-ink-700 dark:text-ink-200 whitespace-nowrap">{row[k] || "—"}</td>);
                             })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button onClick={handleImport} disabled={!csvText.trim() || importing} className="btn-primary">
                  {importing ? "Importing…" : `Import ${parseCsv(csvText).length || 0} Row(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VigorSpace() {
  const { user } = useAuth();
  const { can, canViewZone, canExportCSV, canManageVigorSpace } = usePermissions();
  const canWrite = canManageVigorSpace();
  const canWriteInfluencer = can("influencers", "create") || can("influencers", "edit");
  const isEmployee = user?.role === "Employee";

  const [view, setView] = useState("zones"); // zones | cities | colleges
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCollege, setSelectedCollege] = useState(null);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [editCollege, setEditCollege] = useState(null);
  const [showPocModal, setShowPocModal] = useState(false);
  const [editPoc, setEditPoc] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [streamFilter, setStreamFilter] = useState("");
  const [naacFilter, setNaacFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  const [stats, setStats] = useState({ totalZones: 0, totalCities: 0, totalColleges: 0, totalPocs: 0 });
  const [influencers, setInfluencers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // ── Influencer management state ──────────────────────────────────────────────
  const [infFilters, setInfFilters] = useState({ category: "", tier: "", city: "", minFollowers: "", minEngagement: "", maxBudget: "", ownerId: "" });
  const [showCreateInf, setShowCreateInf] = useState(false);
  const [showInfImport, setShowInfImport] = useState(false);
  const [infForm, setInfForm] = useState(EMPTY_INF_FORM);
  const [editInf, setEditInf] = useState(null);
  const [selectedInf, setSelectedInf] = useState(null);

  const [states, setStates] = useState([]);
  const [showAddState, setShowAddState] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [addingState, setAddingState] = useState(false);

  const [activeStateIdForAddCity, setActiveStateIdForAddCity] = useState(null);
  const [newCityName, setNewCityName] = useState("");
  const [addingCity, setAddingCity] = useState(false);

  // Load zones on mount
  useEffect(() => {
    loadZones();
    loadInfluencers();
    if (!isEmployee) {
      api.get("/auth/users").then((r) => setAllUsers(r.data?.data || [])).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadZones() {
    setLoading(true);
    try {
      const [zonesRes, statsRes] = await Promise.all([
        api.get("/vigor-space/zones"),
        api.get("/vigor-space/stats"),
      ]);
      const filteredZones = (zonesRes.data.data || []).filter(z => canViewZone(z.name + " Zone") || canViewZone(z.name));
      setZones(filteredZones);
      if (statsRes.data.data) setStats(statsRes.data.data);
    } finally {
      setLoading(false);
    }
  }

  function loadInfluencers(filters = infFilters) {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
    api.get("/influencers", { params })
      .then((res) => setInfluencers(res.data?.data || []))
      .catch(() => setInfluencers([]));
  }

  async function handleCreateInfluencer(e) {
    e.preventDefault();
    const payload = {
      ...infForm,
      followers: Number(infForm.followers) || 0,
      averageViews: Number(infForm.averageViews) || 0,
      engagementRate: Number(infForm.engagementRate) || 0,
      commercialCost: Number(infForm.commercialCost) || 0,
      reelCost: Number(infForm.reelCost) || 0,
      storyCost: Number(infForm.storyCost) || 0,
      adRightsCost: Number(infForm.adRightsCost) || 0,
      eventAppearanceCost: Number(infForm.eventAppearanceCost) || 0,
    };
    if (editInf) {
      await api.put(`/influencers/${editInf.id}`, payload);
    } else {
      await api.post("/influencers", payload);
    }
    setShowCreateInf(false);
    setEditInf(null);
    setInfForm(EMPTY_INF_FORM);
    loadInfluencers();
  }

  async function handleDeleteInfluencer(id) {
    if (!window.confirm("Are you sure you want to delete this creator?")) return;
    try {
      await api.delete(`/influencers/${id}`);
      setSelectedInf(null);
      loadInfluencers();
    } catch (err) {
      alert("Failed to delete creator.");
    }
  }

  function exportInfluencersCSV() {
    const headers = ["creatorName", "instagramHandle", "category", "tier", "followers", "engagementRate", "location", "commercialCost"];
    const rows = [headers.join(",")].concat(
      influencers.map((i) => headers.map((h) => `"${String(i[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "vigor-influencers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function selectZone(zone) {
    setSelectedZone(zone);
    setView("cities");
    setActiveStateIdForAddCity(null);
    setShowAddState(false);
    setNewCityName("");
    setNewStateName("");
    setLoading(true);
    try {
      const res = await api.get(`/vigor-space/zones/${zone.id}/cities`);
      setCities(res.data.data || []);
      setStates(res.data.states || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddState(e) {
    e.preventDefault();
    if (!newStateName.trim()) return;
    setAddingState(true);
    try {
      const { data } = await api.post(`/vigor-space/zones/${selectedZone.id}/states`, { stateName: newStateName.trim() });
      setStates((prev) => [...prev, data.data]);
      setNewStateName("");
      setShowAddState(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setAddingState(false);
    }
  }

  async function handleDeleteState(state) {
    const cityCount = cities.filter((c) => c.stateId === state.id).length;
    const msg = cityCount > 0
      ? `Delete "${state.stateName}" and its ${cityCount} city(ies) — along with all their colleges and POCs? This cannot be undone.`
      : `Delete state "${state.stateName}"?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/vigor-space/states/${state.id}`);
      setStates((prev) => prev.filter((s) => s.id !== state.id));
      setCities((prev) => prev.filter((c) => c.stateId !== state.id));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleDeleteCity(city) {
    const msg = city.collegeCount > 0
      ? `Delete "${city.cityName}" and its ${city.collegeCount} college(s) — along with all their POCs? This cannot be undone.`
      : `Delete city "${city.cityName}"?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/vigor-space/cities/${city.id}`);
      setCities((prev) => prev.filter((c) => c.id !== city.id));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleAddCity(e, stateId) {
    e.preventDefault();
    if (!newCityName.trim() || !stateId) return;
    setAddingCity(true);
    try {
      const { data } = await api.post(`/vigor-space/zones/${selectedZone.id}/cities`, {
        cityName: newCityName.trim(),
        stateId
      });
      setCities((prev) => [...prev, data.data]);
      setNewCityName("");
      setActiveStateIdForAddCity(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setAddingCity(false);
    }
  }

  async function selectCity(city) {
    setSelectedCity(city);
    setView("colleges");
    await loadColleges(city.id);
  }

  async function loadColleges(cityId, filters = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.type) params.set("type", filters.type);
      if (filters.stream) params.set("stream", filters.stream);
      if (filters.naacGrade) params.set("naacGrade", filters.naacGrade);
      if (filters.verified) params.set("verified", filters.verified);
      const res = await api.get(`/vigor-space/cities/${cityId}/colleges?${params}`);
      setColleges(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function openCollege(college) {
    const res = await api.get(`/vigor-space/colleges/${college.id}`);
    setSelectedCollege(res.data.data);
  }

  function handleSaveCollege(saved) {
    setColleges((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx === -1) return [...prev, { ...saved, pocCount: 0 }];
      return prev.map((c, i) => (i === idx ? { ...c, ...saved } : c));
    });
    if (selectedCollege?.id === saved.id) setSelectedCollege((prev) => ({ ...prev, ...saved }));
  }

  function handleDeleteCollege(college) {
    if (!confirm(`Delete "${college.collegeName}" and all its POCs?`)) return;
    api.delete(`/vigor-space/colleges/${college.id}`).then(() => {
      setColleges((prev) => prev.filter((c) => c.id !== college.id));
      setSelectedCollege(null);
    });
  }

  function handleSavePoc(saved) {
    setSelectedCollege((prev) => {
      const pocs = prev.pocs || [];
      const idx = pocs.findIndex((p) => p.id === saved.id);
      const newPocs = idx === -1 ? [...pocs, saved] : pocs.map((p, i) => (i === idx ? saved : p));
      return { ...prev, pocs: newPocs };
    });
    setColleges((prev) =>
      prev.map((c) => c.id === selectedCollege?.id ? { ...c, pocCount: (selectedCollege.pocs?.length || 0) + (saved.id ? 0 : 1) } : c)
    );
  }

  function handleDeletePoc(poc) {
    if (!confirm(`Remove POC "${poc.name}"?`)) return;
    api.delete(`/vigor-space/pocs/${poc.id}`).then(() => {
      setSelectedCollege((prev) => ({ ...prev, pocs: (prev.pocs || []).filter((p) => p.id !== poc.id) }));
    });
  }

  async function handleBulkImport(records) {
    const { data } = await api.post("/vigor-space/bulk-import", records);
    if (selectedCity) await loadColleges(selectedCity.id);
    await loadZones();
    return data;
  }

  function applyFilters() {
    loadColleges(selectedCity.id, { q: search, type: typeFilter, stream: streamFilter, naacGrade: naacFilter, verified: verifiedFilter });
  }

  function clearFilters() {
    setSearch(""); setTypeFilter(""); setStreamFilter(""); setNaacFilter(""); setVerifiedFilter("");
    loadColleges(selectedCity.id);
  }

  const zoneConfig = selectedZone ? ZONE_CONFIG[selectedZone.name] : ZONE_CONFIG.North;

  // ─── ZONES VIEW ─────────────────────────────────────────────────────────────
  if (view === "zones") return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-800 dark:text-ink-100 flex items-center gap-2">
            <GraduationCap size={26} className="text-brand-600" /> Vigor Space
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">Community College Database — India</p>
        </div>
        {canWrite && <button onClick={() => setShowBulkImport(true)} className="btn-secondary"><Upload size={15} /> Bulk Import</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Globe2} label="Zones" value={stats.totalZones || zones.length} color="bg-brand-600" />
        <StatCard icon={MapPin} label="Cities" value={stats.totalCities} color="bg-emerald-500" />
        <StatCard icon={Building2} label="Colleges" value={stats.totalColleges} color="bg-amber-500" />
        <StatCard icon={Users} label="POCs" value={stats.totalPocs} color="bg-purple-500" />
        <StatCard icon={Star} label="Influencers" value={influencers.length} color="bg-rose-500" />
      </div>

      {/* Zone Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {zones.map((zone) => {
            const cfg = ZONE_CONFIG[zone.name] || ZONE_CONFIG.North;
            return (
              <button
                key={zone.id}
                onClick={() => selectZone(zone)}
                className="group card p-0 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 text-left"
              >
                <div className={`bg-gradient-to-br ${cfg.gradient} p-5 text-white`}>
                  <div className="text-4xl mb-2">{cfg.emoji}</div>
                  <h3 className="text-lg font-bold">{zone.name} Zone</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 dark:text-ink-400">Cities</span>
                    <span className={`badge ${cfg.badge} font-bold`}>{zone.cityCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 dark:text-ink-400">Colleges</span>
                    <span className={`badge ${cfg.badge} font-bold`}>{zone.collegeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-500 dark:text-ink-400">POCs</span>
                    <span className={`badge ${cfg.badge} font-bold`}>{zone.pocCount}</span>
                  </div>
                  <div className={`flex items-center justify-center gap-1 mt-3 py-2 rounded-lg text-xs font-semibold ${cfg.badge} group-hover:opacity-80 transition-opacity`}>
                    Explore <ChevronRight size={13} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Influencers Section (full management) ─────────────────────────────── */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-rose-500" />
            <h2 className="text-lg font-bold text-ink-800 dark:text-ink-100">Influencers</h2>
            <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-bold">{influencers.length} creators</span>
          </div>
          <div className="flex gap-2">
            {canExportCSV("influencers") && <button className="btn-secondary text-xs" onClick={exportInfluencersCSV}><Download size={13} /> Export CSV</button>}
            {canWriteInfluencer && <button className="btn-primary text-xs" onClick={() => { setEditInf(null); setInfForm(EMPTY_INF_FORM); setShowCreateInf(true); }}><Plus size={13} /> Add Creator</button>}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
            <select className="input text-sm" value={infFilters.category} onChange={(e) => { const f = { ...infFilters, category: e.target.value }; setInfFilters(f); loadInfluencers(f); }}>
              <option value="">All Categories</option>
              {INF_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="input text-sm" value={infFilters.tier} onChange={(e) => { const f = { ...infFilters, tier: e.target.value }; setInfFilters(f); loadInfluencers(f); }}>
              <option value="">All Tiers</option>
              {INF_TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input text-sm" placeholder="City / Location" value={infFilters.city} onChange={(e) => { const f = { ...infFilters, city: e.target.value }; setInfFilters(f); loadInfluencers(f); }} />
            <input className="input text-sm" type="number" placeholder="Min Followers" value={infFilters.minFollowers} onChange={(e) => { const f = { ...infFilters, minFollowers: e.target.value }; setInfFilters(f); loadInfluencers(f); }} />
            <input className="input text-sm" type="number" placeholder="Min Engagement %" value={infFilters.minEngagement} onChange={(e) => { const f = { ...infFilters, minEngagement: e.target.value }; setInfFilters(f); loadInfluencers(f); }} />
            <input className="input text-sm" type="number" placeholder="Max Budget (₹)" value={infFilters.maxBudget} onChange={(e) => { const f = { ...infFilters, maxBudget: e.target.value }; setInfFilters(f); loadInfluencers(f); }} />
            {!isEmployee && (
              <select className="input text-sm" value={infFilters.ownerId} onChange={(e) => { const f = { ...infFilters, ownerId: e.target.value }; setInfFilters(f); loadInfluencers(f); }}>
                <option value="">All Employees</option>
                <option value="unassigned">Unassigned Only</option>
                {allUsers.filter((u) => u.role === "Employee").map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Creator Cards Grid */}
        {influencers.length === 0 ? (
          <div className="card p-10 text-center">
            <Star size={40} className="mx-auto mb-3 text-ink-200 dark:text-ink-600" />
            <p className="text-ink-500 font-medium">No creators match your filters.</p>
            {canWrite && <button className="btn-primary mt-4" onClick={() => { setEditInf(null); setInfForm(EMPTY_INF_FORM); setShowCreateInf(true); }}><Plus size={14} /> Add Creator</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {influencers.filter(inf => inf && inf.id).map((inf) => (
              <button key={inf.id} onClick={() => setSelectedInf(inf)} className="card p-4 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center font-display font-bold flex-shrink-0">
                    {inf.creatorName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800 dark:text-white truncate">{inf.creatorName || "Unnamed"}</p>
                    <p className="text-xs text-ink-400 truncate">{inf.location || "—"} · {inf.language || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">{inf.category || "—"}</span>
                  <span className="badge bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200">{inf.tier || "—"}</span>
                  {inf.createdBy && (
                    <span className="badge bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-400 text-[10px]">
                      {inf.createdBy.split(" ")[0]}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-ink-500 dark:text-ink-300">
                  <div><Instagram size={11} className="inline mr-1" />{fmtNum(inf.followers || 0)} followers</div>
                  <div>Avg Views: {fmtNum(inf.averageViews || 0)}</div>
                  <div>Eng. {inf.engagementRate || 0}%</div>
                  <div className="font-semibold text-ink-700 dark:text-ink-100">₹{Number(inf.commercialCost || 0).toLocaleString("en-IN")}</div>
                  <div className="col-span-2 text-[10px] text-ink-400">Added {fmtDate(inf.createdAt)} by {inf.createdBy || "System"}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Creator Modal */}
      <Modal open={showCreateInf} onClose={() => { setShowCreateInf(false); setEditInf(null); setInfForm(EMPTY_INF_FORM); }} title={editInf ? "Edit Creator" : "Add Creator"} width="max-w-2xl" footer={
        <>
          <button className="btn-secondary" onClick={() => { setShowCreateInf(false); setEditInf(null); setInfForm(EMPTY_INF_FORM); }}>Cancel</button>
          <button className="btn-primary" form="vs-inf-form" type="submit">{editInf ? "Save Changes" : "Add Creator"}</button>
        </>
      }>
        <form id="vs-inf-form" onSubmit={handleCreateInfluencer} className="grid grid-cols-2 gap-4">
          <FormField label="Creator Name *" full><input className="input" required value={infForm.creatorName} onChange={(e) => setInfForm({ ...infForm, creatorName: e.target.value })} /></FormField>
          <FormField label="Instagram Handle"><input className="input" value={infForm.instagramHandle} onChange={(e) => setInfForm({ ...infForm, instagramHandle: e.target.value })} /></FormField>
          <FormField label="YouTube Channel"><input className="input" value={infForm.youtubeChannel} onChange={(e) => setInfForm({ ...infForm, youtubeChannel: e.target.value })} /></FormField>
          <FormField label="Category">
            <select className="input" value={infForm.category} onChange={(e) => setInfForm({ ...infForm, category: e.target.value })}>{INF_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </FormField>
          <FormField label="Tier">
            <select className="input" value={infForm.tier} onChange={(e) => setInfForm({ ...infForm, tier: e.target.value })}>{INF_TIERS.map((t) => <option key={t}>{t}</option>)}</select>
          </FormField>
          <FormField label="Followers"><input className="input" type="number" value={infForm.followers} onChange={(e) => setInfForm({ ...infForm, followers: e.target.value })} /></FormField>
          <FormField label="Average Views"><input className="input" type="number" placeholder="Avg views per post" value={infForm.averageViews} onChange={(e) => setInfForm({ ...infForm, averageViews: e.target.value })} /></FormField>
          <FormField label="Engagement Rate (%)"><input className="input" type="number" value={infForm.engagementRate} onChange={(e) => setInfForm({ ...infForm, engagementRate: e.target.value })} /></FormField>
          <FormField label="Gender">
            <select className="input" value={infForm.gender} onChange={(e) => setInfForm({ ...infForm, gender: e.target.value })}>
              <option>Female</option><option>Male</option><option>Non-binary</option>
            </select>
          </FormField>
          <FormField label="Location"><input className="input" value={infForm.location} onChange={(e) => setInfForm({ ...infForm, location: e.target.value })} /></FormField>
          <FormField label="Language"><input className="input" value={infForm.language} onChange={(e) => setInfForm({ ...infForm, language: e.target.value })} /></FormField>
          <FormField label="Email"><input className="input" type="email" value={infForm.email} onChange={(e) => setInfForm({ ...infForm, email: e.target.value })} /></FormField>
          <FormField label="Contact Number"><input className="input" value={infForm.contactNumber} onChange={(e) => setInfForm({ ...infForm, contactNumber: e.target.value })} /></FormField>
          <FormField label="Manager Details"><input className="input" placeholder="Self-managed or agency name" value={infForm.managerDetails} onChange={(e) => setInfForm({ ...infForm, managerDetails: e.target.value })} /></FormField>
          <FormField label="Commercial Cost (₹)"><input className="input" type="number" value={infForm.commercialCost} onChange={(e) => setInfForm({ ...infForm, commercialCost: e.target.value })} /></FormField>
          <FormField label="Reel Cost (₹)"><input className="input" type="number" value={infForm.reelCost} onChange={(e) => setInfForm({ ...infForm, reelCost: e.target.value })} /></FormField>
          <FormField label="Story Cost (₹)"><input className="input" type="number" value={infForm.storyCost} onChange={(e) => setInfForm({ ...infForm, storyCost: e.target.value })} /></FormField>
          <FormField label="Ad Rights Cost (₹)"><input className="input" type="number" value={infForm.adRightsCost} onChange={(e) => setInfForm({ ...infForm, adRightsCost: e.target.value })} /></FormField>
          <FormField label="Event Appearance Cost (₹)"><input className="input" type="number" value={infForm.eventAppearanceCost} onChange={(e) => setInfForm({ ...infForm, eventAppearanceCost: e.target.value })} /></FormField>
          <FormField label="Previous Brand Collaborations" full><input className="input" placeholder="e.g. Glowtone, Urban Threads" value={infForm.previousBrandCollaborations} onChange={(e) => setInfForm({ ...infForm, previousBrandCollaborations: e.target.value })} /></FormField>
          <FormField label="Portfolio / Instagram Link" full><input className="input" type="url" placeholder="https://..." value={infForm.portfolioLinks} onChange={(e) => setInfForm({ ...infForm, portfolioLinks: e.target.value })} /></FormField>
          {!isEmployee && allUsers.filter((u) => u.role === "Employee").length > 0 && (
            <FormField label="Assign to Employee" full>
              <select className="input" value={infForm.ownerId || ""} onChange={(e) => setInfForm({ ...infForm, ownerId: e.target.value })}>
                <option value="">Unassigned</option>
                {allUsers.filter((u) => u.role === "Employee").map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </FormField>
          )}
        </form>
      </Modal>

      {/* Creator Detail Drawer */}
      <Drawer open={!!selectedInf} onClose={() => setSelectedInf(null)} title={selectedInf?.creatorName} subtitle={`${selectedInf?.category || ""} · ${selectedInf?.tier || ""}`}>
        {selectedInf && (
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
              {selectedInf.instagramHandle && <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Instagram size={11} /> {selectedInf.instagramHandle}</span>}
              {selectedInf.youtubeChannel && <span className="badge bg-rose-50 text-rose-600 dark:bg-rose-500/10"><Youtube size={11} /> {selectedInf.youtubeChannel}</span>}
            </div>
            <div><span className="text-[11px] bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 rounded-full px-2.5 py-0.5 font-medium">Added {fmtDate(selectedInf.createdAt)}</span></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Followers</p><p className="text-ink-800 dark:text-white">{Number(selectedInf.followers || 0).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Average Views</p><p className="text-ink-800 dark:text-white">{Number(selectedInf.averageViews || 0).toLocaleString("en-IN")}</p></div>
              <div><p className="label">Engagement Rate</p><p className="text-ink-800 dark:text-white">{selectedInf.engagementRate}%</p></div>
              <div><p className="label">Gender</p><p className="text-ink-800 dark:text-white">{selectedInf.gender}</p></div>
              <div><p className="label">Location</p><p className="text-ink-800 dark:text-white">{selectedInf.location}</p></div>
              <div><p className="label">Language</p><p className="text-ink-800 dark:text-white">{selectedInf.language}</p></div>
              <div><p className="label">Manager</p><p className="text-ink-800 dark:text-white">{selectedInf.managerDetails || "Self-managed"}</p></div>
              {selectedInf.ownerName && (
                <div><p className="label">Assigned To</p><p className="text-ink-800 dark:text-white font-semibold">{selectedInf.ownerName}</p></div>
              )}
              <div><p className="label">Added By</p><p className="text-ink-800 dark:text-white">{selectedInf.createdBy || "—"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selectedInf.email}</p></div>
              <div><p className="label">Contact</p><p className="text-ink-800 dark:text-white">{selectedInf.contactNumber}</p></div>
            </div>
            <div>
              <p className="label mb-2">Rate Card</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="card p-3"><p className="text-ink-400 text-xs">Commercial</p><p className="font-semibold">₹{Number(selectedInf.commercialCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Reel</p><p className="font-semibold">₹{Number(selectedInf.reelCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Story</p><p className="font-semibold">₹{Number(selectedInf.storyCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Ad Rights</p><p className="font-semibold">₹{Number(selectedInf.adRightsCost || 0).toLocaleString("en-IN")}</p></div>
                <div className="card p-3"><p className="text-ink-400 text-xs">Event Appearance</p><p className="font-semibold">₹{Number(selectedInf.eventAppearanceCost || 0).toLocaleString("en-IN")}</p></div>
              </div>
            </div>
            {selectedInf.previousBrandCollaborations && (
              <div><p className="label mb-1">Previous Collaborations</p><p className="text-sm text-ink-700 dark:text-ink-100">{selectedInf.previousBrandCollaborations}</p></div>
            )}
            {selectedInf.portfolioLinks && (
              <a href={selectedInf.portfolioLinks} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center"><Bookmark size={15} /> View Portfolio</a>
            )}
            <hr className="border-ink-100 dark:border-ink-700" />
            <CommentsPanel entityType="influencer" entityId={selectedInf?.id} />
            <hr className="border-ink-100 dark:border-ink-700" />
            <EditHistoryPanel createdBy={selectedInf.createdBy} createdAt={selectedInf.createdAt} updatedBy={selectedInf.updatedBy} updatedAt={selectedInf.updatedAt} history={selectedInf.history} />
            <div className="flex gap-2">
              {can("influencers", "edit") && (
                <button
                  className="btn-secondary flex-1"
                  onClick={() => { setInfForm({ ...EMPTY_INF_FORM, ...selectedInf, followers: String(selectedInf.followers || ""), averageViews: String(selectedInf.averageViews || ""), engagementRate: String(selectedInf.engagementRate || ""), commercialCost: String(selectedInf.commercialCost || ""), reelCost: String(selectedInf.reelCost || ""), storyCost: String(selectedInf.storyCost || ""), adRightsCost: String(selectedInf.adRightsCost || ""), eventAppearanceCost: String(selectedInf.eventAppearanceCost || "") }); setEditInf(selectedInf); setShowCreateInf(true); }}
                ><Pencil size={14} /> Edit</button>
              )}
              {can("influencers", "delete") && (
                <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded flex-1 transition-colors" onClick={() => handleDeleteInfluencer(selectedInf.id)}>Delete Creator</button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <BulkImportModal open={showBulkImport} onClose={() => setShowBulkImport(false)} onImport={handleBulkImport} />
    </div>
  );

  // ─── CITIES VIEW ─────────────────────────────────────────────────────────────
  if (view === "cities") return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400 mb-3">
          <button onClick={() => { setView("zones"); setSelectedZone(null); }} className="hover:text-brand-600 font-medium transition-colors">Vigor Space</button>
          <ChevronRight size={14} />
          <span className="font-semibold text-ink-700 dark:text-ink-200">{selectedZone?.name} Zone</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display text-ink-800 dark:text-ink-100 flex items-center gap-2">
            <span className="text-3xl">{zoneConfig.emoji}</span> {selectedZone?.name} Zone
            <span className="text-sm font-normal text-ink-400">({states.length} states, {cities.length} cities)</span>
          </h1>
          <div className="flex gap-2">
            <button onClick={() => { setView("zones"); setSelectedZone(null); }} className="btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            {canWrite && (
              <button
                onClick={() => { setShowAddState(true); setNewStateName(""); }}
                className="btn-primary"
              >
                <Plus size={14} /> Add State
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add State inline modal */}
      {showAddState && (
        <div className="card p-4 border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200 mb-3 flex items-center gap-2">
            <Layers size={15} className="text-brand-500" /> Add a New State to {selectedZone?.name} Zone
          </p>
          <form onSubmit={handleAddState} className="flex gap-2">
            <input
              autoFocus
              className="input flex-1"
              placeholder={`e.g. Tamil Nadu, Maharashtra, Uttar Pradesh…`}
              value={newStateName}
              onChange={(e) => setNewStateName(e.target.value)}
            />
            <button type="submit" disabled={!newStateName.trim() || addingState} className="btn-primary">
              {addingState ? "Adding…" : "Add State"}
            </button>
            <button type="button" onClick={() => setShowAddState(false)} className="btn-secondary">
              Cancel
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : states.length === 0 ? (
        <div className="card p-8 text-center max-w-md mx-auto space-y-4">
          <div className="text-4xl">🗺️</div>
          <h3 className="font-bold text-ink-800 dark:text-ink-100">No states in this zone</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400">Add a state to begin adding cities.</p>
          <button onClick={() => { setShowAddState(true); setNewStateName(""); }} className="btn-primary mx-auto">
            <Plus size={14} /> Add State
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {states.map((state) => {
            const stateCities = cities.filter((c) => c.stateId === state.id);
            const isAddingCityToThisState = activeStateIdForAddCity === state.id;

            return (
              <div key={state.id} className="space-y-4">
                {/* State Section Header */}
                <div className="flex items-center justify-between border-b border-ink-100 dark:border-ink-700 pb-2">
                  <h2 className="text-lg font-bold text-ink-800 dark:text-ink-100 flex items-center gap-2">
                    <Layers size={16} className="text-brand-500" /> {state.stateName}
                    <span className="text-xs font-normal text-ink-400">({stateCities.length} cities)</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {canWrite && (
                      <button
                        onClick={() => { setActiveStateIdForAddCity(state.id); setNewCityName(""); }}
                        className="btn-ghost text-xs text-brand-600 dark:text-brand-400 font-semibold"
                      >
                        <Plus size={12} className="inline mr-1" /> Add City
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => handleDeleteState(state)}
                        className="btn-ghost text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold"
                        title="Delete state"
                      >
                        <Trash2 size={13} className="inline mr-1" /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Add City Inline Form for this State */}
                {isAddingCityToThisState && (
                  <div className="card p-3 border border-brand-300 dark:border-brand-700 bg-brand-50/20 dark:bg-brand-900/5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <form onSubmit={(e) => handleAddCity(e, state.id)} className="flex gap-2">
                      <input
                        autoFocus
                        className="input flex-1 text-sm py-1.5"
                        placeholder={`City name (e.g. Coimbatore, Madurai)`}
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                      />
                      <button type="submit" disabled={!newCityName.trim() || addingCity} className="btn-primary text-sm py-1.5">
                        {addingCity ? "Adding…" : "Add"}
                      </button>
                      <button type="button" onClick={() => setActiveStateIdForAddCity(null)} className="btn-secondary text-sm py-1.5">
                        Cancel
                      </button>
                    </form>
                  </div>
                )}

                {/* Cities Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {stateCities.map((city) => (
                    <div
                      key={city.id}
                      className="group card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 relative cursor-pointer"
                      onClick={() => selectCity(city)}
                    >
                      {canWrite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCity(city);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-md text-ink-400 hover:text-red-500 hover:bg-ink-100 dark:hover:bg-ink-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete city"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-brand-500 flex-shrink-0" />
                        <h3 className="font-bold text-ink-800 dark:text-ink-100 text-sm leading-tight pr-5">{city.cityName}</h3>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ink-400">Colleges</span>
                          <span className={`badge ${zoneConfig.badge} text-xs font-bold`}>{city.collegeCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ink-400">POCs</span>
                          <span className="badge bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 text-xs font-bold">{city.pocCount}</span>
                        </div>
                      </div>
                      <div className={`flex items-center justify-center gap-1 mt-3 py-1.5 rounded-lg text-xs font-semibold ${zoneConfig.badge} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        View <ChevronRight size={11} />
                      </div>
                    </div>
                  ))}
                  
                  {/* Quick add city card */}
                  {!isAddingCityToThisState && (
                    <button
                      onClick={() => { setActiveStateIdForAddCity(state.id); setNewCityName(""); }}
                      className="group card p-4 border-2 border-dashed border-ink-200 dark:border-ink-600 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all duration-150 text-left flex flex-col items-center justify-center gap-2 min-h-[110px]"
                    >
                      <div className={`rounded-full p-2 bg-ink-100 dark:bg-ink-700 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors`}>
                        <Plus size={18} className="text-ink-400 group-hover:text-brand-600 transition-colors" />
                      </div>
                      <span className="text-xs font-semibold text-ink-400 group-hover:text-brand-600 transition-colors">Add City</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── COLLEGES VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
          <button onClick={() => { setView("zones"); setSelectedZone(null); setSelectedCity(null); }} className="hover:text-brand-600 transition-colors">Vigor Space</button>
          <ChevronRight size={14} />
          <button onClick={() => { setView("cities"); setSelectedCity(null); }} className="hover:text-brand-600 transition-colors">{selectedZone?.name} Zone</button>
          <ChevronRight size={14} />
          <span className="font-semibold text-ink-700 dark:text-ink-200">{selectedCity?.cityName}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold font-display text-ink-800 dark:text-ink-100 flex items-center gap-2">
            <MapPin size={20} className="text-brand-500" /> {selectedCity?.cityName}
            <span className="text-sm font-normal text-ink-400">({colleges.length} colleges)</span>
          </h1>
          <div className="flex gap-2">
            {canWrite && <button onClick={() => setShowBulkImport(true)} className="btn-secondary"><Upload size={14} /> Import</button>}
            {canWrite && <button onClick={() => { setEditCollege(null); setShowCollegeModal(true); }} className="btn-primary"><Plus size={14} /> Add College</button>}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-8 w-52" placeholder="Search colleges…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>
          <select className="input w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {COLLEGE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="input w-36" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
            <option value="">All Streams</option>
            {STREAMS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-36" value={naacFilter} onChange={(e) => setNaacFilter(e.target.value)}>
            <option value="">All NAAC</option>
            {NAAC_GRADES.map((g) => <option key={g}>NAAC {g}</option>)}
          </select>
          <select className="input w-32" value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Yes">Verified</option>
            <option value="No">Unverified</option>
          </select>
          <button onClick={applyFilters} className="btn-primary"><Filter size={14} /> Apply</button>
          <button onClick={clearFilters} className="btn-ghost text-xs">Clear</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : colleges.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <GraduationCap size={48} className="text-ink-200 dark:text-ink-600 mb-3" />
            <p className="text-ink-500 dark:text-ink-400 font-medium">No colleges found</p>
            <p className="text-xs text-ink-400 mt-1">Add a college or adjust your filters</p>
            <button onClick={() => { setEditCollege(null); setShowCollegeModal(true); }} className="btn-primary mt-4"><Plus size={14} /> Add College</button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
                  <tr>
                    {["College", "Type", "Stream", "NAAC", "Main Fest", "Footfall", "POCs", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50 dark:divide-ink-700/50">
                  {colleges.map((college) => (
                    <tr key={college.id} className="hover:bg-ink-50 dark:hover:bg-ink-700/30 transition-colors cursor-pointer" onClick={() => openCollege(college)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-800 dark:text-ink-100 leading-tight">{college.collegeName}</p>
                        {college.category && <p className="text-[10px] text-ink-400 mt-0.5">{college.category}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300 whitespace-nowrap">{college.type || "—"}</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300 whitespace-nowrap">{college.stream || "—"}</td>
                      <td className="px-4 py-3">
                        {college.naacGrade ? (
                          <span className={`badge font-bold ${college.naacGrade === "A++" ? "bg-emerald-100 text-emerald-700" : college.naacGrade?.startsWith("A") ? "bg-blue-100 text-blue-700" : "bg-ink-100 text-ink-600"}`}>
                            {college.naacGrade}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {college.mainFestName ? (
                          <div>
                            <p className="text-ink-700 dark:text-ink-200 font-medium">{college.mainFestName}</p>
                            {college.usualPeriod && <p className="text-[10px] text-ink-400">{college.usualPeriod} · {college.durationDays}d</p>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300 whitespace-nowrap">{college.estimatedFootfall || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 font-bold">{college.pocCount || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        {college.verified === "Yes" ? (
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : (
                          <span className="badge bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-400">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {canWrite && (
                            <button
                              className="btn-ghost p-1.5 text-ink-400 hover:text-brand-600"
                              onClick={() => { setEditCollege(college); setShowCollegeModal(true); }}
                            ><Pencil size={13} /></button>
                          )}
                          {canWrite && (
                            <button
                              className="btn-ghost p-1.5 text-ink-400 hover:text-red-500"
                              onClick={() => handleDeleteCollege(college)}
                            ><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* College Drawer */}
      {selectedCollege && (
        <CollegeDrawer
          college={selectedCollege}
          zoneConfig={zoneConfig}
          onClose={() => setSelectedCollege(null)}
          onEdit={() => { setEditCollege(selectedCollege); setShowCollegeModal(true); }}
          onDelete={() => { handleDeleteCollege(selectedCollege); }}
          onAddPoc={() => { setEditPoc(null); setShowPocModal(true); }}
          onEditPoc={(poc) => { setEditPoc(poc); setShowPocModal(true); }}
          onDeletePoc={handleDeletePoc}
        />
      )}

      {/* Modals */}
      <CollegeModal
        open={showCollegeModal}
        onClose={() => { setShowCollegeModal(false); setEditCollege(null); }}
        cityId={selectedCity?.id}
        zoneId={selectedZone?.id}
        college={editCollege}
        onSave={handleSaveCollege}
      />
      <PocModal
        open={showPocModal}
        onClose={() => { setShowPocModal(false); setEditPoc(null); }}
        collegeId={selectedCollege?.id}
        poc={editPoc}
        onSave={handleSavePoc}
      />
      <BulkImportModal open={showBulkImport} onClose={() => setShowBulkImport(false)} onImport={handleBulkImport} />
    </div>
  );
}
