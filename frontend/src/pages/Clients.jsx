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

const EMPTY_FORM = {
  brandName: "", contactPerson: "", designation: "", email: "", phone: "",
  industry: "", gstNumber: "", billingAddress: "", accountManager: "",
};

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);

  const canWrite = user.role === "Super Admin" || user.role === "Manager";

  function load() {
    setLoading(true);
    api.get("/clients").then((res) => setClients(res.data?.data || [])).catch(() => setClients([])).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openClient(client) {
    setSelected(client);
    setHistory(null);
    api.get(`/clients/${client.id}/history`).then((res) => setHistory(res.data?.data || [])).catch(() => setHistory([]));
  }

  async function createClient(e) {
    e.preventDefault();
    await api.post("/clients", { ...form, status: "Active", accountManagerId: user.id });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  function exportCSV() {
    const headers = ["brandName", "contactPerson", "designation", "email", "phone", "industry", "gstNumber", "billingAddress", "accountManager"];
    const rows = [headers.join(",")].concat(
      clients.map((c) => headers.map((h) => `"${String(c[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-clients-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: "brandName", label: "Brand" },
    { key: "contactPerson", label: "Contact" },
    { key: "industry", label: "Industry" },
    { key: "accountManager", label: "Account Manager" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Brand accounts, contacts, and relationship history."
        actions={
          <>
            <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>
            {canWrite && <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>}
            {canWrite && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> New Client
              </button>
            )}
          </>
        }
      />

      {showImport && (
        <CSVImportModal
          moduleType="clients"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

      {!loading && <DataTable columns={columns} rows={clients} onRowClick={openClient} searchPlaceholder="Search clients..." />}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Client" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="client-form" type="submit">Create Client</button>
        </>
      }>
        <form id="client-form" onSubmit={createClient} className="grid grid-cols-2 gap-4">
          <FormField label="Brand Name" full>
            <input className="input" required value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </FormField>
          <FormField label="Contact Person">
            <input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          </FormField>
          <FormField label="Designation">
            <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Industry">
            <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </FormField>
          <FormField label="GST Number">
            <input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </FormField>
          <FormField label="Billing Address" full>
            <input className="input" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
          </FormField>
          <FormField label="Account Manager" full>
            <input className="input" value={form.accountManager} onChange={(e) => setForm({ ...form, accountManager: e.target.value })} />
          </FormField>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.brandName} subtitle={selected?.industry}>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="label">Contact</p><p className="text-ink-800 dark:text-white">{selected.contactPerson}</p></div>
              <div><p className="label">Designation</p><p className="text-ink-800 dark:text-white">{selected.designation || "—"}</p></div>
              <div><p className="label">Email</p><p className="text-ink-800 dark:text-white">{selected.email}</p></div>
              <div><p className="label">Phone</p><p className="text-ink-800 dark:text-white">{selected.phone}</p></div>
              <div><p className="label">GST</p><p className="text-ink-800 dark:text-white">{selected.gstNumber || "—"}</p></div>
              <div><p className="label">Account Manager</p><p className="text-ink-800 dark:text-white">{selected.accountManager}</p></div>
              <div className="col-span-2"><p className="label">Billing Address</p><p className="text-ink-800 dark:text-white">{selected.billingAddress}</p></div>
            </div>

            {history && (
              <>
                <div>
                  <p className="label mb-2">Campaign History</p>
                  <div className="space-y-2">
                    {history.campaigns.length === 0 && <p className="text-sm text-ink-400">No campaigns yet.</p>}
                    {history.campaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2">
                        <span className="text-sm text-ink-700 dark:text-ink-100">{c.campaignName}</span>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label mb-2">Payment History</p>
                  <div className="space-y-2">
                    {history.invoices.length === 0 && <p className="text-sm text-ink-400">No invoices yet.</p>}
                    {history.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2">
                        <span className="text-sm text-ink-700 dark:text-ink-100">{inv.invoiceNumber} &middot; ₹{Number(inv.amount).toLocaleString("en-IN")}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label mb-2">Documents</p>
                  <div className="space-y-2">
                    {history.documents.length === 0 && <p className="text-sm text-ink-400">No documents uploaded.</p>}
                    {history.documents.map((d) => (
                      <div key={d.id} className="text-sm text-ink-700 dark:text-ink-100 border border-ink-100 dark:border-ink-700 rounded-lg px-3 py-2">
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
