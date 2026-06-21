const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const rows = db.find("notifications", (n) => n.userId === req.user.id || n.userId === null);
  res.json({ data: rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.put("/:id/read", (req, res) => {
  const row = db.update("notifications", req.params.id, { read: true });
  if (!row) return res.status(404).json({ error: "Notification not found." });
  res.json({ data: row });
});

router.put("/read-all", (req, res) => {
  const rows = db.all("notifications").map((n) =>
    n.userId === req.user.id || n.userId === null ? { ...n, read: true } : n
  );
  db.replaceAll("notifications", rows);
  res.json({ data: true });
});

module.exports = router;
