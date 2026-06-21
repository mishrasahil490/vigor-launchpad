const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isThisQuarter(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const q = (m) => Math.floor(m / 3);
  return d.getFullYear() === now.getFullYear() && q(d.getMonth()) === q(now.getMonth());
}

router.get("/kpis", (req, res) => {
  const leads = db.all("leads");
  const clients = db.all("clients");
  const campaigns = db.all("campaigns");
  const influencers = db.all("influencers");
  const vendors = db.all("vendors");
  const events = db.all("events");
  const invoices = db.all("invoices");
  const tasks = db.all("tasks");

  const activeLeadStatuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation"];
  const revenueThisMonth = invoices.filter((i) => isThisMonth(i.issueDate)).reduce((s, i) => s + Number(i.amount || 0), 0);
  const revenueThisQuarter = invoices.filter((i) => isThisQuarter(i.issueDate)).reduce((s, i) => s + Number(i.amount || 0), 0);
  const campaignSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);

  const now = new Date();
  const overdueTasks = tasks.filter((t) => t.status !== "Completed" && t.dueDate && new Date(t.dueDate) < now).length;
  const pendingFollowUps = db.all("activities").filter((a) => a.type === "Follow-up" && a.status !== "Done").length;

  res.json({
    data: {
      totalLeads: leads.length,
      activeLeads: leads.filter((l) => activeLeadStatuses.includes(l.status)).length,
      totalClients: clients.length,
      activeCampaigns: campaigns.filter((c) => ["Active", "In Progress", "Live"].includes(c.status)).length,
      totalInfluencers: influencers.length,
      totalVendors: vendors.length,
      totalEvents: events.length,
      revenueThisMonth,
      revenueThisQuarter,
      campaignSpend,
      pendingFollowUps,
      overdueTasks,
    },
  });
});

router.get("/charts", (req, res) => {
  const leads = db.all("leads");
  const campaigns = db.all("campaigns");
  const invoices = db.all("invoices");
  const influencers = db.all("influencers");
  const events = db.all("events");
  const tasks = db.all("tasks");
  const users = db.all("users");

  // Lead funnel
  const funnelOrder = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
  const leadFunnel = funnelOrder.map((stage) => ({
    stage,
    count: leads.filter((l) => l.status === stage).length,
  }));

  // Campaign status distribution
  const campaignStatusCounts = {};
  campaigns.forEach((c) => (campaignStatusCounts[c.status] = (campaignStatusCounts[c.status] || 0) + 1));
  const campaignStatusDistribution = Object.entries(campaignStatusCounts).map(([status, count]) => ({ status, count }));

  // Revenue trend (last 6 months)
  const monthsBack = 6;
  const revenueTrend = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const total = invoices.filter((inv) => monthKey(inv.issueDate) === key).reduce((s, inv) => s + Number(inv.amount || 0), 0);
    revenueTrend.push({ month: label, revenue: total });
  }

  // Employee performance (leads won + tasks completed per employee)
  const employeePerformance = users
    .filter((u) => u.role === "Employee" || u.role === "Manager")
    .map((u) => ({
      name: u.name,
      leadsWon: leads.filter((l) => (l.ownerId === u.id || l.ownerName === u.name) && l.status === "Won").length,
      tasksCompleted: tasks.filter((t) => (t.assignedToId === u.id || t.assignedToName === u.name) && t.status === "Completed").length,
    }));

  // Influencer category distribution
  const categoryCounts = {};
  influencers.forEach((i) => (categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1));
  const influencerCategoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));

  // Brand-wise campaign performance (spend per client)
  const clients = db.all("clients");
  const brandCampaignPerformance = clients.map((c) => {
    const clientCampaigns = campaigns.filter((camp) => camp.clientId === c.id);
    return {
      brand: c.brandName,
      campaigns: clientCampaigns.length,
      budget: clientCampaigns.reduce((s, camp) => s + Number(camp.budget || 0), 0),
      spend: clientCampaigns.reduce((s, camp) => s + Number(camp.spend || 0), 0),
    };
  });

  // Event performance (budget vs spend)
  const eventPerformance = events.map((e) => ({
    name: e.eventName,
    budget: Number(e.budget || 0),
    spend: Number(e.spend || 0),
  }));

  // Monthly lead acquisition (last 6 months)
  const monthlyLeadAcquisition = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const count = leads.filter((l) => monthKey(l.createdAt) === key).length;
    monthlyLeadAcquisition.push({ month: label, leads: count });
  }

  res.json({
    data: {
      leadFunnel,
      campaignStatusDistribution,
      revenueTrend,
      employeePerformance,
      influencerCategoryDistribution,
      brandCampaignPerformance,
      eventPerformance,
      monthlyLeadAcquisition,
    },
  });
});

module.exports = router;
