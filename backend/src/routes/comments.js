const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

/**
 * Generic entity comments.
 * GET  /api/comments?entityType=client&entityId=3
 * POST /api/comments  { entityType, entityId, message }
 */
router.get("/", (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ error: "entityType and entityId are required." });
  }
  const items = db.find(
    "comments",
    (c) => c.entityType === entityType && c.entityId === Number(entityId)
  );
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ data: items });
});

router.post("/", (req, res) => {
  const { entityType, entityId, message } = req.body;
  if (!entityType || !entityId || !message) {
    return res.status(400).json({ error: "entityType, entityId, and message are required." });
  }
  const comment = db.insert("comments", {
    entityType,
    entityId: Number(entityId),
    message,
    authorName: req.user.name,
  });
  res.status(201).json({ data: comment });
});

module.exports = router;
