import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";

const CATEGORIES = ["Production", "Photography", "Videography", "Venue", "Hospitality", "Logistics", "Printing", "Digital Marketing", "Other"];
const EMPTY_FORM = { vendorName: "", serviceType: "Production", contactPerson: "", phone: "", email: "", gstNumber: "", address: "", paymentTerms: "Net 30" };

export default function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canWrite = ["Super Admin", "Manager", "Finance"].includes(user.role);

  function load() {
    api.get("/vendors").then((res) => setVendors(res.data.data));
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

  const columns = [
    { key: "vendorName", label: "Vendor" },
    { key: "serviceType", label: "Category" },
    { key: "contactPerson", label: "Contact" },
    { key: "phone", label: "Phone" },
    { key: "paymentTerms", label: "Payment Terms" },
  ];

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Production, photography, venue, and logistics partners."
        actions={canWrite && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Vendor</button>
        )}
      />
      <DataTable columns={columns} rows={vendors} searchPlaceholder="Search vendors..." />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Vendor" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="vendor-form" type="submit">Add Vendor</button>
        </>
      }>
        <form id="vendor-form" onSubmit={createVendor} className="grid grid-cols-2 gap-4">
          <FormField label="Vendor Name" full><input className="input" required value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} /></FormField>
          <FormField label="Service Type">
            <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </FormField>
          <FormField label="Contact Person"><input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="GST Number"><input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></FormField>
          <FormField label="Address" full><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></FormField>
          <FormField label="Payment Terms" full><input className="input" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></FormField>
        </form>
      </Modal>
    </div>
  );
}
