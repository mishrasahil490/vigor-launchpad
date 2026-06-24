import { useEffect, useState } from "react";
import { Plus, Shield, Check, X, ShieldAlert, Trash2, KeyRound, Loader2, CheckCircle } from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import { useAuth } from "../context/AuthContext";

const ROLES = ["Super Admin", "Manager", "Employee", "Finance"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "Employee", team: "" };

const PAGES_SLUGS = [
  "dashboard", "leads", "clients", "influencers", "campaigns",
  "events", "vendors", "tasks", "finance", "reports", "vigor-space", "settings"
];

const ENTITIES = [
  { slug: "leads", label: "Leads" },
  { slug: "clients", label: "Clients" },
  { slug: "influencers", label: "Influencers" },
  { slug: "campaigns", label: "Campaigns" },
  { slug: "events", label: "Events" },
  { slug: "vendors", label: "Vendors" },
  { slug: "tasks", label: "Tasks" },
  { slug: "finance", label: "Finance" },
  { slug: "reports", label: "Reports" }
];

const ZONES = ["North Zone", "South Zone", "East Zone", "West Zone", "Central Zone"];

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  // Change password state
  const EMPTY_PWD = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const [pwdForm, setPwdForm] = useState(EMPTY_PWD);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Permissions editor state
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
  const [permsForm, setPermsForm] = useState(null);
  const [permsError, setPermsError] = useState("");
  const [savingPerms, setSavingPerms] = useState(false);

  function load() {
    api.get("/auth/users").then((res) => setUsers(res.data.data));
  }
  useEffect(load, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      return setPwdError("New passwords do not match.");
    }
    if (pwdForm.newPassword.length < 6) {
      return setPwdError("New password must be at least 6 characters.");
    }
    setPwdLoading(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdSuccess(res.data.message || "Password changed successfully.");
      setPwdForm(EMPTY_PWD);
    } catch (err) {
      setPwdError(err.response?.data?.error || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  }

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

  async function deleteUser(u) {
    if (!window.confirm(`Are you sure you want to permanently delete "${u.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${u.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete user.");
    }
  }

  function handleOpenPermissions(u) {
    setSelectedUserForPerms(u);
    api.get(`/auth/users/${u.id}/permissions`).then((res) => {
      const p = res.data.data;
      setPermsForm({
        pages: p.pages || [],
        vigorSpace: {
          canViewZones: p.vigorSpace?.canViewZones || "*",
          canManageZones: !!p.vigorSpace?.canManageZones,
          canExportCSV: !!p.vigorSpace?.canExportCSV,
        },
        actions: p.actions || {},
      });
    });
  }

  async function handleSavePermissions() {
    setPermsError("");
    setSavingPerms(true);
    try {
      await api.put(`/auth/users/${selectedUserForPerms.id}/permissions`, permsForm);
      setSelectedUserForPerms(null);
      setPermsForm(null);
      load();
    } catch (err) {
      setPermsError(err.response?.data?.error || "Failed to save permissions.");
    } finally {
      setSavingPerms(false);
    }
  }

  function togglePageAccess(slug) {
    setPermsForm((prev) => {
      const pages = prev.pages.includes(slug)
        ? prev.pages.filter((p) => p !== slug)
        : [...prev.pages, slug];
      return { ...prev, pages };
    });
  }

  function toggleActionPermission(entity, action) {
    setPermsForm((prev) => {
      const actions = { ...prev.actions };
      const current = actions[entity] || { view: false, create: false, edit: false, delete: false, exportCSV: false };
      actions[entity] = {
        ...current,
        [action]: !current[action]
      };
      return { ...prev, actions };
    });
  }

  function toggleVSZone(zone) {
    setPermsForm((prev) => {
      const vs = { ...prev.vigorSpace };
      let currentZones = vs.canViewZones;
      if (currentZones === "*") {
        currentZones = [zone];
      } else if (Array.isArray(currentZones)) {
        currentZones = currentZones.includes(zone)
          ? currentZones.filter((z) => z !== zone)
          : [...currentZones, zone];
        if (currentZones.length === 0) currentZones = "*";
      } else {
        currentZones = "*";
      }
      vs.canViewZones = currentZones;
      return { ...prev, vigorSpace: vs };
    });
  }

  // Determine if caller role can edit target permissions
  function canEditPermsOf(u) {
    if (currentUser.role === "Super Admin") return true;
    if (currentUser.role === "Manager" || currentUser.role === "Finance") {
      // Only edit employees
      return u.role !== "Super Admin" && u.role !== "Manager" && u.role !== "Finance";
    }
    return false;
  }

  return (
    <div>
      <PageHeader
        title="Settings — User Management"
        subtitle="Manage team members, roles, and access across Vigor Launchpad."
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add User</button>}
      />

      {/* ── My Account: Change Password ── */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-brand-600 dark:text-brand-400" />
          <h3 className="font-display font-semibold text-ink-800 dark:text-white">My Account — Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Current Password</label>
            <input
              id="current-password"
              className="input"
              type="password"
              placeholder="Enter current password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              id="new-password"
              className="input"
              type="password"
              placeholder="At least 6 characters"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              placeholder="Repeat new password"
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>
          {pwdError && (
            <p className="col-span-full text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{pwdError}</p>
          )}
          {pwdSuccess && (
            <div className="col-span-full flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-lg">
              <CheckCircle size={15} /> {pwdSuccess}
            </div>
          )}
          <div className="col-span-full flex justify-end">
            <button id="change-password-submit" type="submit" disabled={pwdLoading} className="btn-primary">
              {pwdLoading && <Loader2 size={15} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>

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
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {canEditPermsOf(u) && (
                      <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => handleOpenPermissions(u)}>
                        <Shield size={12} className="inline mr-1" /> Permissions
                      </button>
                    )}
                    <button className="btn-ghost !px-2 !py-1" onClick={() => toggleStatus(u)}>{u.status === "Active" ? "Deactivate" : "Activate"}</button>
                    {currentUser?.role === "Super Admin" && currentUser?.id !== u.id && (
                      <button
                        className="btn-ghost !px-2 !py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        onClick={() => deleteUser(u)}
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
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

      {/* Permissions Editor Drawer */}
      {selectedUserForPerms && permsForm && (
        <Drawer
          open={!!selectedUserForPerms}
          onClose={() => { setSelectedUserForPerms(null); setPermsForm(null); }}
          title={`Edit Permissions: ${selectedUserForPerms.name}`}
          width="max-w-3xl"
        >
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Basic Info</p>
              <div className="card p-3 bg-ink-50/50 dark:bg-ink-900/30 grid grid-cols-3 gap-2 text-xs">
                <div><span className="font-semibold text-ink-500">Role:</span> {selectedUserForPerms.role}</div>
                <div><span className="font-semibold text-ink-500">Email:</span> {selectedUserForPerms.email}</div>
                <div><span className="font-semibold text-ink-500">Team:</span> {selectedUserForPerms.team || "—"}</div>
              </div>
            </div>

            {/* Page Access */}
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Page Access</p>
              <div className="grid grid-cols-3 gap-2">
                {PAGES_SLUGS.map((slug) => {
                  const hasAccess = permsForm.pages.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => togglePageAccess(slug)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border transition-colors ${
                        hasAccess
                          ? "bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/10 dark:border-brand-800 dark:text-brand-400"
                          : "border-ink-100 text-ink-500 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-900/40"
                      }`}
                    >
                      <span className="capitalize">{slug.replace("-", " ")}</span>
                      {hasAccess ? <Check size={14} /> : <X size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vigor Space Settings */}
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Vigor Space Zone Access</p>
              <div className="card p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-ink-700 dark:text-ink-200 mb-2">
                    <input
                      type="checkbox"
                      checked={permsForm.vigorSpace.canViewZones === "*"}
                      onChange={(e) => {
                        setPermsForm((prev) => ({
                          ...prev,
                          vigorSpace: { ...prev.vigorSpace, canViewZones: e.target.checked ? "*" : [] }
                        }));
                      }}
                      className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    Access to All Zones (*)
                  </label>
                </div>

                {permsForm.vigorSpace.canViewZones !== "*" && (
                  <div>
                    <p className="text-[11px] text-ink-400 mb-2">Restrict to specific zones:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ZONES.map((zone) => {
                        const isChecked = Array.isArray(permsForm.vigorSpace.canViewZones) && permsForm.vigorSpace.canViewZones.includes(zone);
                        return (
                          <label key={zone} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleVSZone(zone)}
                              className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                            />
                            {zone}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t border-ink-100 dark:border-ink-700/60 pt-3 grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={permsForm.vigorSpace.canManageZones}
                      onChange={(e) => {
                        setPermsForm((prev) => ({
                          ...prev,
                          vigorSpace: { ...prev.vigorSpace, canManageZones: e.target.checked }
                        }));
                      }}
                      className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    Can Manage Zones (Add/Edit/Delete)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={permsForm.vigorSpace.canExportCSV}
                      onChange={(e) => {
                        setPermsForm((prev) => ({
                          ...prev,
                          vigorSpace: { ...prev.vigorSpace, canExportCSV: e.target.checked }
                        }));
                      }}
                      className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    Can Export CSV
                  </label>
                </div>
              </div>
            </div>

            {/* Entity Actions Matrix */}
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Entity Permissions Matrix</p>
              <div className="card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-ink-50 dark:bg-ink-900/40 uppercase text-[10px] text-ink-500">
                    <tr>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2 text-center">View</th>
                      <th className="px-3 py-2 text-center">Create</th>
                      <th className="px-3 py-2 text-center">Edit</th>
                      <th className="px-3 py-2 text-center">Delete</th>
                      <th className="px-3 py-2 text-center">Export CSV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50 dark:divide-ink-700/50">
                    {ENTITIES.map((ent) => {
                      const permissions = permsForm.actions[ent.slug] || { view: false, create: false, edit: false, delete: false, exportCSV: false };
                      return (
                        <tr key={ent.slug}>
                          <td className="px-3 py-2 font-medium text-ink-700 dark:text-ink-200 capitalize">{ent.label}</td>
                          {["view", "create", "edit", "delete"].map((act) => (
                            <td key={act} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!permissions[act]}
                                onChange={() => toggleActionPermission(ent.slug, act)}
                                className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!permissions.exportCSV}
                                onChange={() => toggleActionPermission(ent.slug, "exportCSV")}
                                className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                              />
                              {permissions.exportCSV && currentUser?.role === "Super Admin" && (
                                <div className="mt-1 flex flex-col gap-1 items-stretch max-w-[150px]">
                                  <select
                                    className="input text-[10px] !py-0.5 !px-1.5 h-6"
                                    value={permissions.exportCSVExpiresAt ? "temporary" : "permanent"}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPermsForm((prev) => {
                                        const actions = { ...prev.actions };
                                        actions[ent.slug] = {
                                          ...actions[ent.slug],
                                          exportCSVExpiresAt: val === "temporary" ? new Date(Date.now() + 86400000).toISOString().slice(0, 16) : null
                                        };
                                        return { ...prev, actions };
                                      });
                                    }}
                                  >
                                    <option value="permanent">Permanent</option>
                                    <option value="temporary">Temporary</option>
                                  </select>
                                  {permissions.exportCSVExpiresAt && (
                                    <input
                                      type="datetime-local"
                                      className="input text-[9px] !p-0.5 h-6"
                                      value={permissions.exportCSVExpiresAt.slice(0, 16)}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPermsForm((prev) => {
                                          const actions = { ...prev.actions };
                                          actions[ent.slug] = {
                                            ...actions[ent.slug],
                                            exportCSVExpiresAt: val ? new Date(val).toISOString() : null
                                          };
                                          return { ...prev, actions };
                                        });
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {permsError && (
              <div className="flex gap-2 text-rose-600 text-xs items-center bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg">
                <ShieldAlert size={14} />
                <span>{permsError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                className="btn-secondary flex-1 justify-center"
                onClick={() => { setSelectedUserForPerms(null); setPermsForm(null); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 justify-center"
                disabled={savingPerms}
                onClick={handleSavePermissions}
              >
                {savingPerms ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
