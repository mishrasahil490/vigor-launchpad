import { useEffect, useState } from "react";
import { Plus, Download, Upload, Globe } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CSVImportModal from "../components/CSVImportModal";
import CommentsPanel from "../components/CommentsPanel";
import EditHistoryPanel from "../components/EditHistoryPanel";
import MaskedField, { maskPhone } from "../components/MaskedField";
import { usePermissions } from "../context/PermissionsContext";

const CATEGORIES = ["Production", "Photography", "Videography", "Venue", "Hospitality", "Logistics", "Printing", "Digital Marketing", "Other"];
const REGIONS = ["North", "South", "East", "West", "Central", "Pan India"];
const YES_NO = ["Yes", "No", "Partial"];

const EMPTY_FORM = {
  vendorName: "", contactNumber: "", region: "", companyName: "", websiteEmail: "",
  city: "", schoolPermission: "No", collegePermission: "No", manPower: "",
  fabrication: "No", serviceType: "Production", contactPerson: "", phone: "",
  email: "", gstNumber: "", address: "", paymentTerms: "Net 30",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function YesNoBadge({ value }) {
  const color = value === "Yes"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
    : value === "Partial"
    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  return <span className={`badge ${color}`}>{value || "No"}</span>;
}

export default function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);

  const { can, canExportCSV } = usePermissions();
  const canCreate = can("vendors", "create");
  const canDelete = can("vendors", "delete");
  const canExport = canExportCSV("vendors");

  function load() {
    api.get("/vendors").then((res) => setVendors(res.data?.data || [])).catch(() => setVendors([]));
  }
  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  async function createVendor(e) {
    e.preventDefault();
    await api.post("/vendors", form);
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await api.delete(`/vendors/${id}`);
      setSelected(null);
      load();
    } catch (err) {
      console.error("Error deleting vendor:", err);
      alert("Failed to delete vendor.");
    }
  }

  function exportCSV() {
    const headers = ["vendorName", "companyName", "contactNumber", "region", "city", "websiteEmail", "schoolPermission", "collegePermission", "manPower", "fabrication", "serviceType", "gstNumber", "paymentTerms", "createdAt"];
    const rows = [headers.join(",")].concat(
      vendors.map((v) => headers.map((h) => `"${String(v[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-vendors-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: "vendorName", label: "Name" },
    { key: "companyName", label: "Company" },
    { key: "contactNumber", label: "Contact No.", render: (r) => maskPhone(r.contactNumber) },
    { key: "region", label: "Region" },
    { key: "city", label: "City" },
    { key: "schoolPermission", label: "School Perm.", render: (r) => <YesNoBadge value={r.schoolPermission} /> },
    { key: "collegePermission", label: "College Perm.", render: (r) => <YesNoBadge value={r.collegePermission} /> },
    { key: "fabrication", label: "Fabrication", render: (r) => <YesNoBadge value={r.fabrication} /> },
    { key: "createdAt", label: "Date Added", render: (r) => <span className="text-xs text-ink-400">{fmtDate(r.createdAt)}</span> },
    ...(canDelete ? [{
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded transition-colors font-semibold"
        >
          Delete
        </button>
      )
    }] : [])
  ];

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Production, photography, venue, and logistics partners."
        actions={
          <>
            {canExport && <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>}
            {canCreate && <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>}
            {canCreate && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Vendor</button>
            )}
          </>
        }
      />
      <DataTable columns={columns} rows={vendors} onRowClick={(row) => setSelected(row)} searchPlaceholder="Search vendors..." />

      {showImport && (
        <CSVImportModal
          moduleType="vendors"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Vendor" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="vendor-form" type="submit">Create Vendor</button>
        </>
      }>
        <form id="vendor-form" onSubmit={createVendor} className="grid grid-cols-2 gap-4">
          <FormField label="Vendor Name" full>
            <input className="input" required value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          </FormField>
          <FormField label="Contact Person">
            <input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          </FormField>
          <FormField label="Contact Number">
            <input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </FormField>
          <FormField label="Company Name">
            <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </FormField>
          <FormField label="Website/Email">
            <input className="input" value={form.websiteEmail} onChange={(e) => setForm({ ...form, websiteEmail: e.target.value })} />
          </FormField>
          <FormField label="Region">
            <select className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              <option value="">Select region...</option>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </FormField>
          <FormField label="City">
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </FormField>
          <FormField label="School Permission">
            <select className="input" value={form.schoolPermission} onChange={(e) => setForm({ ...form, schoolPermission: e.target.value })}>{YES_NO.map((y) => <option key={y}>{y}</option>)}</select>
          </FormField>
          <FormField label="College Permission">
            <select className="input" value={form.collegePermission} onChange={(e) => setForm({ ...form, collegePermission: e.target.value })}>{YES_NO.map((y) => <option key={y}>{y}</option>)}</select>
          </FormField>
          <FormField label="Man Power">
            <input className="input" type="number" value={form.manPower} onChange={(e) => setForm({ ...form, manPower: e.target.value })} />
          </FormField>
          <FormField label="Fabrication">
            <select className="input" value={form.fabrication} onChange={(e) => setForm({ ...form, fabrication: e.target.value })}>{YES_NO.map((y) => <option key={y}>{y}</option>)}</select>
          </FormField>
          <FormField label="Service Type">
            <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </FormField>
          <FormField label="GST Number">
            <input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </FormField>
          <FormField label="Payment Terms">
            <input className="input" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
          </FormField>
          <FormField label="Address" full>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormField>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.vendorName} subtitle={selected?.serviceType}>
        {selected && (
          <div className="space-y-6">
            {/* Date Added badge */}
            <div>
              <span className="text-[11px] bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 rounded-full px-2.5 py-0.5 font-medium">
                Added {fmtDate(selected.createdAt)}{selected.createdBy ? ` by ${selected.createdBy}` : ""}
              </span>
            </div>

            {/* Core details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Contact Person</p><p className="text-ink-800 dark:text-white">{selected.contactPerson || "—"}</p></div>
              <div><p className="label">Contact Number</p><p className="text-ink-800 dark:text-white">{selected.contactNumber || selected.phone || "—"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email || selected.websiteEmail || "—"}</p></div>
              <div><p className="label">Company</p><p className="text-ink-800 dark:text-white">{selected.companyName || "—"}</p></div>
              <div><p className="label">Region</p><p className="text-ink-800 dark:text-white">{selected.region || "—"}</p></div>
              <div><p className="label">City</p><p className="text-ink-800 dark:text-white">{selected.city || "—"}</p></div>
              <div><p className="label">GST Number</p><p className="text-ink-800 dark:text-white">{selected.gstNumber || "—"}</p></div>
              <div><p className="label">Payment Terms</p><p className="text-ink-800 dark:text-white">{selected.paymentTerms || "—"}</p></div>
              {selected.address && <div className="col-span-2"><p className="label">Address</p><p className="text-ink-800 dark:text-white">{selected.address}</p></div>}
            </div>

            {/* Capabilities */}
            <div>
              <p className="label mb-2">Capabilities</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="card p-3 text-center">
                  <p className="text-xs text-ink-400 mb-1">Man Power</p>
                  <p className="font-semibold text-ink-800 dark:text-white">{selected.manPower || "—"}</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-xs text-ink-400 mb-1">School Perm.</p>
                  <div className="flex justify-center mt-1"><YesNoBadge value={selected.schoolPermission} /></div>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-xs text-ink-400 mb-1">College Perm.</p>
                  <div className="flex justify-center mt-1"><YesNoBadge value={selected.collegePermission} /></div>
                </div>
                <div className="card p-3 col-span-3 flex items-center justify-between">
                  <p className="text-xs text-ink-400">Fabrication</p>
                  <YesNoBadge value={selected.fabrication} />
                </div>
              </div>
            </div>

            {selected.websiteEmail && (
              <a
                href={selected.websiteEmail.startsWith("http") ? selected.websiteEmail : `https://${selected.websiteEmail}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary w-full justify-center"
              >
                <Globe size={15} /> Visit Website / Email
              </a>
            )}

            <hr className="border-ink-100 dark:border-ink-700" />
            <CommentsPanel entityType="vendor" entityId={selected.id} />
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
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded w-full transition-colors mt-4"
              >
                Delete Vendor
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
