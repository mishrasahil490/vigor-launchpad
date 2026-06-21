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

  const deliverables = db.find("deliverables", (d) => d.campaignId === campaign.id);
  const assignments = db.find("campaignInfluencers", (a) => a.campaignId === campaign.id);

  res.json({ data: { ...campaign, deliverables, assignments } });
});

router.post("/", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("campaigns", { spend: 0, ...req.body });
  res.status(201).json({ data: row });
});

router.put("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.update("campaigns", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Campaign not found." });
  res.json({ data: row });
});

router.delete("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const ok = db.remove("campaigns", req.params.id);
  if (!ok) return res.status(404).json({ error: "Campaign not found." });
  res.status(204).end();
});

// Assign / remove influencers on a campaign
router.post("/:id/influencers", authorize("Super Admin", "Manager"), (req, res) => {
  const campaign = db.getById("campaigns", req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });
  const row = db.insert("campaignInfluencers", {
    campaignId: campaign.id,
    influencerId: req.body.influencerId,
    agreedCost: req.body.agreedCost || 0,
    deliverableType: req.body.deliverableType || "Reel",
    approvalStatus: "Pending",
    contentStatus: "Not Started",
  });
  res.status(201).json({ data: row });
});

router.put("/:id/influencers/:assignmentId", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.update("campaignInfluencers", req.params.assignmentId, req.body);
  if (!row) return res.status(404).json({ error: "Assignment not found." });
  res.json({ data: row });
});

router.delete("/:id/influencers/:assignmentId", authorize("Super Admin", "Manager"), (req, res) => {
  db.remove("campaignInfluencers", req.params.assignmentId);
  res.status(204).end();
});

// Deliverables / content calendar
router.post("/:id/deliverables", (req, res) => {
  const row = db.insert("deliverables", {
    campaignId: Number(req.params.id),
    title: req.body.title,
    influencerId: req.body.influencerId || null,
    dueDate: req.body.dueDate,
    status: req.body.status || "Pending",
    approvalStatus: req.body.approvalStatus || "Pending Review",
  });
  res.status(201).json({ data: row });
});

router.put("/:id/deliverables/:deliverableId", (req, res) => {
  const row = db.update("deliverables", req.params.deliverableId, req.body);
  if (!row) return res.status(404).json({ error: "Deliverable not found." });
  res.json({ data: row });
});

// Profitability: budget vs spend vs invoiced revenue
router.get("/:id/profitability", (req, res) => {
  const campaign = db.getById("campaigns", req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });
  const assignments = db.find("campaignInfluencers", (a) => a.campaignId === campaign.id);
  const influencerCost = assignments.reduce((sum, a) => sum + (Number(a.agreedCost) || 0), 0);
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
