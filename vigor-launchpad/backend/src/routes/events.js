const express = require("express");
const db = require("../db");
const { authenticate, authorize, scopeToUser } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  let rows = db.all("events");
  rows = scopeToUser(req, rows, "eventManagerId");
  const { status, clientId, q } = req.query;
  if (status) rows = rows.filter((r) => r.status === status);
  if (clientId) rows = rows.filter((r) => r.clientId === Number(clientId));
  if (q) rows = rows.filter((r) => r.eventName.toLowerCase().includes(q.toLowerCase()));
  res.json({ data: rows, total: rows.length });
});

router.get("/:id", (req, res) => {
  const event = db.getById("events", req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  const vendors = db.find("eventVendors", (v) => v.eventId === event.id);
  const attendance = db.find("eventInfluencers", (a) => a.eventId === event.id);
  const sponsors = db.find("eventSponsors", (s) => s.eventId === event.id);
  const tasks = db.find("tasks", (t) => t.linkedType === "event" && t.linkedId === event.id);
  res.json({ data: { ...event, vendors, attendance, sponsors, tasks } });
});

router.post("/", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("events", { spend: 0, ...req.body });
  res.status(201).json({ data: row });
});

router.put("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.update("events", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Event not found." });
  res.json({ data: row });
});

router.delete("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const ok = db.remove("events", req.params.id);
  if (!ok) return res.status(404).json({ error: "Event not found." });
  res.status(204).end();
});

// Vendor allocation
router.post("/:id/vendors", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("eventVendors", {
    eventId: Number(req.params.id),
    vendorId: req.body.vendorId,
    serviceScope: req.body.serviceScope || "",
    cost: req.body.cost || 0,
    paymentStatus: req.body.paymentStatus || "Pending",
  });
  res.status(201).json({ data: row });
});
router.delete("/:id/vendors/:linkId", (req, res) => {
  db.remove("eventVendors", req.params.linkId);
  res.status(204).end();
});

// Influencer attendance tracking
router.post("/:id/influencers", (req, res) => {
  const row = db.insert("eventInfluencers", {
    eventId: Number(req.params.id),
    influencerId: req.body.influencerId,
    role: req.body.role || "Appearance",
    fee: req.body.fee || 0,
    attendanceStatus: "Invited",
  });
  res.status(201).json({ data: row });
});
router.put("/:id/influencers/:linkId", (req, res) => {
  const row = db.update("eventInfluencers", req.params.linkId, req.body);
  res.json({ data: row });
});

// Sponsor management
router.post("/:id/sponsors", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("eventSponsors", {
    eventId: Number(req.params.id),
    sponsorName: req.body.sponsorName,
    sponsorshipValue: req.body.sponsorshipValue || 0,
    benefitsProvided: req.body.benefitsProvided || "",
  });
  res.status(201).json({ data: row });
});

// Event profitability
router.get("/:id/profitability", (req, res) => {
  const event = db.getById("events", req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  const vendorCosts = db.find("eventVendors", (v) => v.eventId === event.id).reduce((s, v) => s + Number(v.cost || 0), 0);
  const influencerFees = db.find("eventInfluencers", (a) => a.eventId === event.id).reduce((s, a) => s + Number(a.fee || 0), 0);
  const sponsorRevenue = db.find("eventSponsors", (s) => s.eventId === event.id).reduce((s, sp) => s + Number(sp.sponsorshipValue || 0), 0);
  const clientRevenue = db.find("invoices", (i) => i.eventId === event.id).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalRevenue = sponsorRevenue + clientRevenue;
  const totalCost = vendorCosts + influencerFees;
  res.json({
    data: {
      budget: event.budget,
      vendorCosts,
      influencerFees,
      sponsorRevenue,
      clientRevenue,
      totalRevenue,
      totalCost,
      profit: totalRevenue - totalCost,
    },
  });
});

module.exports = router;
