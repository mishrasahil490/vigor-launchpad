import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import FormField from "../components/FormField";

const ROLES = ["Super Admin", "Manager", "Employee", "Finance"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "Employee", team: "" };

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  function load() {
    api.get("/auth/users").then((res) => setUsers(res.data.data));
  }
  useEffect(load, []);

  async function createUser(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create user.");
    }
  }

  async function toggleStatus(u) {
    await api.put(`/auth/users/${u.id}`, { status: u.status === "Active" ? "Inactive" : "Active" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Settings — User Management"
        subtitle="Manage team members, roles, and access across Vigor Launchpad."
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add User</button>}
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-ink-50 dark:bg-ink-900/40 text-left text-xs uppercase text-ink-500 dark:text-ink-300">
            <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-50 dark:border-ink-700/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-800 dark:text-white">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.team || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3"><button className="btn-ghost !px-2 !py-1" onClick={() => toggleStatus(u)}>{u.status === "Active" ? "Deactivate" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Team Member" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="user-form" type="submit">Create User</button>
        </>
      }>
        <form id="user-form" onSubmit={createUser} className="grid grid-cols-2 gap-4">
          <FormField label="Full Name" full><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Email" full><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Temporary Password" full><input className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></FormField>
          <FormField label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </FormField>
          <FormField label="Team"><input className="input" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} /></FormField>
          {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
