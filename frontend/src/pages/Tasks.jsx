import { useEffect, useState } from "react";
import { Plus, MessageSquare, Download, Upload } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import FormField from "../components/FormField";
import CSVImportModal from "../components/CSVImportModal";

const STATUSES = ["Pending", "In Progress", "Completed", "Overdue"];
const PRIORITIES = ["Low", "Medium", "High"];
const PRIORITY_COLOR = { Low: "bg-slate-100 text-slate-600", Medium: "bg-amber-50 text-amber-700", High: "bg-rose-50 text-rose-700" };

const EMPTY_FORM = { title: "", description: "", priority: "Medium", dueDate: "", assignedToName: "" };

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");

  function load() {
    api.get("/tasks").then((res) => setTasks(res.data?.data || [])).catch(() => setTasks([]));
  }
  useEffect(() => {
    load();
    window.addEventListener("db-change", load);
    return () => window.removeEventListener("db-change", load);
  }, []);

  function openTask(t) {
    api.get(`/tasks/${t.id}`).then((res) => setSelected(res.data?.data || [])).catch(() => setSelected([]));
  }

  async function createTask(e) {
    e.preventDefault();
    await api.post("/tasks", { ...form, assignedToId: user.id, status: "Pending" });
    setShowCreate(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function updateStatus(task, status) {
    await api.put(`/tasks/${task.id}`, { status });
    setSelected((s) => (s ? { ...s, status } : s));
    load();
  }

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/tasks/${selected.id}/comments`, { message: comment });
    setComment("");
    const res = await api.get(`/tasks/${selected.id}`);
    setSelected(res.data?.data);
  }

  function exportCSV() {
    const headers = ["title", "description", "priority", "status", "dueDate", "assignedToId", "assignedToName", "linkedType", "linkedId"];
    const rows = [headers.join(",")].concat(
      tasks.map((t) => headers.map((h) => `"${String(t[h] ?? "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vigor-tasks-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Stay on top of follow-ups, approvals, and deliverable deadlines."
        actions={
          <>
            <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export CSV</button>
            <button className="btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Import CSV</button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Task</button>
          </>
        }
      />

      {showImport && (
        <CSVImportModal
          moduleType="tasks"
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); load(); }}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <div key={status} className="card p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="font-semibold text-sm text-ink-700 dark:text-white">{status}</p>
              <span className="badge bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-200">{tasks.filter((t) => t.status === status).length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {tasks.filter((t) => t.status === status).map((t) => (
                <button key={t.id} onClick={() => openTask(t)} className="w-full text-left card !shadow-none border border-ink-100 dark:border-ink-700 p-3 hover:border-brand-300 transition-colors">
                  <p className="text-sm font-medium text-ink-800 dark:text-white mb-1">{t.title}</p>
                  <div className="flex items-center justify-between">
                    <span className={`badge ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                    <span className="text-xs text-ink-400">{t.dueDate}</span>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">{t.assignedToName}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Task" footer={
        <>
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn-primary" form="task-form" type="submit">Create Task</button>
        </>
      }>
        <form id="task-form" onSubmit={createTask} className="grid grid-cols-2 gap-4">
          <FormField label="Title" full><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormField label="Description" full><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormField label="Priority">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
          </FormField>
          <FormField label="Due Date"><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
          <FormField label="Assigned To" full><input className="input" placeholder="Team member name" value={form.assignedToName} onChange={(e) => setForm({ ...form, assignedToName: e.target.value })} /></FormField>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title} subtitle={selected?.assignedToName}>
        {selected && (
          <div className="space-y-5">
            <p className="text-sm text-ink-700 dark:text-ink-100">{selected.description || "No description provided."}</p>
            <div>
              <p className="label mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== "Overdue").map((s) => (
                  <button key={s} onClick={() => updateStatus(selected, s)} className={`badge border ${selected.status === s ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-200 border-ink-200 dark:border-ink-600"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-2"><MessageSquare size={12} className="inline mr-1" /> Comments</p>
              <form onSubmit={addComment} className="flex gap-2 mb-3">
                <input className="input" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
                <button className="btn-secondary" type="submit">Post</button>
              </form>
              <div className="space-y-2">
                {selected.comments?.map((c) => (
                  <div key={c.id} className="border-l-2 border-brand-200 pl-3">
                    <p className="text-xs text-ink-400">{c.authorName}</p>
                    <p className="text-sm text-ink-700 dark:text-ink-100">{c.message}</p>
                  </div>
                ))}
                {(!selected.comments || selected.comments.length === 0) && <p className="text-sm text-ink-400">No comments yet.</p>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
