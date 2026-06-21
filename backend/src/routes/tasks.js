const express = require("express");
const db = require("../db");
const { authenticate, scopeToUser } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function withComputedStatus(task) {
  if (task.status !== "Completed" && task.dueDate && new Date(task.dueDate) < new Date()) {
    return { ...task, status: "Overdue" };
  }
  return task;
}

router.get("/", (req, res) => {
  let rows = db.all("tasks");
  rows = scopeToUser(req, rows, "assignedToId");
  const { status, priority, linkedType, linkedId, q } = req.query;
  rows = rows.map(withComputedStatus);
  if (status) rows = rows.filter((r) => r.status === status);
  if (priority) rows = rows.filter((r) => r.priority === priority);
  if (linkedType) rows = rows.filter((r) => r.linkedType === linkedType);
  if (linkedId) rows = rows.filter((r) => r.linkedId === Number(linkedId));
  if (q) rows = rows.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
  res.json({ data: rows, total: rows.length });
});

router.get("/:id", (req, res) => {
  const task = db.getById("tasks", req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const comments = db.find("taskComments", (c) => c.taskId === task.id);
  res.json({ data: { ...withComputedStatus(task), comments } });
});

router.post("/", (req, res) => {
  const row = db.insert("tasks", {
    title: req.body.title,
    description: req.body.description || "",
    priority: req.body.priority || "Medium",
    status: req.body.status || "Pending",
    dueDate: req.body.dueDate,
    assignedToId: req.body.assignedToId,
    assignedToName: req.body.assignedToName,
    linkedType: req.body.linkedType || null,
    linkedId: req.body.linkedId || null,
    createdBy: req.user.name,
  });
  res.status(201).json({ data: row });
});

router.put("/:id", (req, res) => {
  const row = db.update("tasks", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Task not found." });
  res.json({ data: row });
});

router.delete("/:id", (req, res) => {
  const ok = db.remove("tasks", req.params.id);
  if (!ok) return res.status(404).json({ error: "Task not found." });
  res.status(204).end();
});

router.post("/:id/comments", (req, res) => {
  const task = db.getById("tasks", req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const comment = db.insert("taskComments", {
    taskId: task.id,
    authorName: req.user.name,
    message: req.body.message,
  });
  res.status(201).json({ data: comment });
});

module.exports = router;
