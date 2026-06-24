const express = require("express");
const db = require("../db");
const { authenticate, authorize, scopeToUser } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  let rows = db.all("campaigns");
  rows = scopeToUser(req, rows, "campaignManagerId");
  const { status, clientId, q } = req.query;
  if (status) rows = rows.filter((r) => r.status === status);
  if (clientId) rows = rows.filter((r) => r.clientId === Number(clientId));
  if (q) rows = rows.filter((r) => r.campaignName.toLowerCase().includes(q.toLowerCase()));
  res.json({ data: rows, total: rows.length });
});

router.get("/:id", (req, res) => {
  const campaign = db.getById("campaigns", req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  res.json({ data: campaign });
});

router.post("/", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("campaigns", { spend: 0, ...req.body }, req.user);
  res.status(201).json({ data: row });
});

router.post("/bulk", authorize("Super Admin", "Manager"), (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty array of campaign records." });
  }
  const inserted = [];
  const errors = [];
  records.forEach((record, i) => {
    try {
      const row = db.insert("campaigns", { spend: 0, ...record }, req.user);
      inserted.push(row);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  });
  res.status(201).json({ inserted: inserted.length, errors });
});

router.put("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.update("campaigns", req.params.id, req.body, req.user);
  if (!row) return res.status(404).json({ error: "Campaign not found." });
  res.json({ data: row });
});

router.delete("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const ok = db.remove("campaigns", req.params.id);
  if (!ok) return res.status(404).json({ error: "Campaign not found." });
  res.status(204).end();
});

// Profitability: budget vs spend vs invoiced revenue
router.get("/:id/profitability", (req, res) => {
  const campaign = db.getById("campaigns", req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });
  const influencerCost = 0;
  const invoices = db.find("invoices", (i) => i.campaignId === campaign.id);
  const revenue = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const profit = revenue - influencerCost - (Number(campaign.otherCosts) || 0);

  res.json({
    data: {
      budget: campaign.budget,
      influencerCost,
      otherCosts: campaign.otherCosts || 0,
      revenue,
      profit,
      margin: revenue ? Math.round((profit / revenue) * 100) : 0,
    },
  });
});

module.exports = router;
