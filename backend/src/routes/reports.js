const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(",")));
  return lines.join("\n");
}

function respond(req, res, rows) {
  if (req.query.format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report.csv"`);
    return res.send(toCSV(rows));
  }
  res.json({ data: rows, total: rows.length });
}

router.get("/lead-conversion", (req, res) => {
  const leads = db.all("leads");
  const total = leads.length;
  const won = leads.filter((l) => l.status === "Won").length;
  const lost = leads.filter((l) => l.status === "Lost").length;
  const open = total - won - lost;
  const bySource = {};
  leads.forEach((l) => {
    bySource[l.leadSource] = bySource[l.leadSource] || { source: l.leadSource, total: 0, won: 0 };
    bySource[l.leadSource].total += 1;
    if (l.status === "Won") bySource[l.leadSource].won += 1;
  });
  respond(req, res, Object.values(bySource).map((r) => ({ ...r, conversionRate: r.total ? Math.round((r.won / r.total) * 100) : 0 })));
});

router.get("/employee-performance", (req, res) => {
  const users = db.all("users").filter((u) => u.role === "Employee" || u.role === "Manager");
  const leads = db.all("leads");
  const tasks = db.all("tasks");
  const campaigns = db.all("campaigns");
  const rows = users.map((u) => ({
    employee: u.name,
    role: u.role,
    leadsAssigned: leads.filter((l) => l.ownerId === u.id || l.ownerName === u.name).length,
    leadsWon: leads.filter((l) => (l.ownerId === u.id || l.ownerName === u.name) && l.status === "Won").length,
    campaignsManaged: campaigns.filter((c) => c.campaignManagerId === u.id || c.campaignManager === u.name).length,
    tasksCompleted: tasks.filter((t) => (t.assignedToId === u.id || t.assignedToName === u.name) && t.status === "Completed").length,
    tasksOverdue: tasks.filter((t) => (t.assignedToId === u.id || t.assignedToName === u.name) && t.status !== "Completed" && t.dueDate && new Date(t.dueDate) < new Date()).length,
  }));
  respond(req, res, rows);
});

router.get("/campaign-performance", (req, res) => {
  const campaigns = db.all("campaigns");
  const invoices = db.all("invoices");
  const assignments = db.all("campaignInfluencers");
  const rows = campaigns.map((c) => {
    const cost = assignments.filter((a) => a.campaignId === c.id).reduce((s, a) => s + Number(a.agreedCost || 0), 0);
    const revenue = invoices.filter((i) => i.campaignId === c.id).reduce((s, i) => s + Number(i.amount || 0), 0);
    return {
      campaign: c.campaignName,
      status: c.status,
      budget: c.budget,
      spend: c.spend || 0,
      influencerCost: cost,
      revenue,
      profit: revenue - cost - (c.otherCosts || 0),
    };
  });
  respond(req, res, rows);
});

router.get("/influencer-performance", (req, res) => {
  const influencers = db.all("influencers");
  const assignments = db.all("campaignInfluencers");
  const rows = influencers.map((inf) => {
    const linked = assignments.filter((a) => a.influencerId === inf.id);
    return {
      creator: inf.creatorName,
      category: inf.category,
      tier: inf.tier,
      followers: inf.followers,
      engagementRate: inf.engagementRate,
      campaignsBooked: linked.length,
      totalEarnings: linked.reduce((s, a) => s + Number(a.agreedCost || 0), 0),
    };
  });
  respond(req, res, rows);
});

router.get("/client-revenue", (req, res) => {
  const clients = db.all("clients");
  const invoices = db.all("invoices");
  const campaigns = db.all("campaigns");
  const rows = clients.map((c) => ({
    client: c.brandName,
    industry: c.industry,
    campaigns: campaigns.filter((camp) => camp.clientId === c.id).length,
    totalInvoiced: invoices.filter((i) => i.clientId === c.id).reduce((s, i) => s + Number(i.amount || 0), 0),
    totalPaid: invoices.filter((i) => i.clientId === c.id && i.status === "Paid").reduce((s, i) => s + Number(i.amount || 0), 0),
    outstanding: invoices.filter((i) => i.clientId === c.id && i.status !== "Paid").reduce((s, i) => s + Number(i.amount || 0), 0),
  }));
  respond(req, res, rows);
});

router.get("/event-profitability", (req, res) => {
  const events = db.all("events");
  const eventVendors = db.all("eventVendors");
  const eventInfluencers = db.all("eventInfluencers");
  const eventSponsors = db.all("eventSponsors");
  const invoices = db.all("invoices");
  const rows = events.map((e) => {
    const vendorCosts = eventVendors.filter((v) => v.eventId === e.id).reduce((s, v) => s + Number(v.cost || 0), 0);
    const influencerFees = eventInfluencers.filter((a) => a.eventId === e.id).reduce((s, a) => s + Number(a.fee || 0), 0);
    const sponsorRevenue = eventSponsors.filter((s) => s.eventId === e.id).reduce((s, sp) => s + Number(sp.sponsorshipValue || 0), 0);
    const clientRevenue = invoices.filter((i) => i.eventId === e.id).reduce((s, i) => s + Number(i.amount || 0), 0);
    return {
      event: e.eventName,
      budget: e.budget,
      vendorCosts,
      influencerFees,
      sponsorRevenue,
      clientRevenue,
      profit: sponsorRevenue + clientRevenue - vendorCosts - influencerFees,
    };
  });
  respond(req, res, rows);
});

router.get("/vendor-spend", (req, res) => {
  const vendors = db.all("vendors");
  const vendorPayments = db.all("vendorPayments");
  const eventVendors = db.all("eventVendors");
  const rows = vendors.map((v) => ({
    vendor: v.vendorName,
    serviceType: v.serviceType,
    totalPaid: vendorPayments.filter((p) => p.vendorId === v.id && p.status === "Paid").reduce((s, p) => s + Number(p.amount || 0), 0),
    pending: vendorPayments.filter((p) => p.vendorId === v.id && p.status !== "Paid").reduce((s, p) => s + Number(p.amount || 0), 0),
    eventsServiced: eventVendors.filter((ev) => ev.vendorId === v.id).length,
  }));
  respond(req, res, rows);
});

module.exports = router;
