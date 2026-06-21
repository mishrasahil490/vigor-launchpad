const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  if (!q) return res.json({ data: [] });

  const results = [];

  db.all("leads").forEach((l) => {
    if (`${l.leadName} ${l.companyName} ${l.email}`.toLowerCase().includes(q)) {
      results.push({ type: "Lead", id: l.id, title: l.leadName, subtitle: l.companyName, route: `/leads/${l.id}` });
    }
  });
  db.all("clients").forEach((c) => {
    if (`${c.brandName} ${c.contactPerson}`.toLowerCase().includes(q)) {
      results.push({ type: "Client", id: c.id, title: c.brandName, subtitle: c.contactPerson, route: `/clients/${c.id}` });
    }
  });
  db.all("influencers").forEach((i) => {
    if (`${i.creatorName} ${i.instagramHandle} ${i.category}`.toLowerCase().includes(q)) {
      results.push({ type: "Influencer", id: i.id, title: i.creatorName, subtitle: i.category, route: `/influencers/${i.id}` });
    }
  });
  db.all("campaigns").forEach((c) => {
    if (`${c.campaignName}`.toLowerCase().includes(q)) {
      results.push({ type: "Campaign", id: c.id, title: c.campaignName, subtitle: c.status, route: `/campaigns/${c.id}` });
    }
  });
  db.all("events").forEach((e) => {
    if (`${e.eventName} ${e.venue}`.toLowerCase().includes(q)) {
      results.push({ type: "Event", id: e.id, title: e.eventName, subtitle: e.venue, route: `/events/${e.id}` });
    }
  });
  db.all("vendors").forEach((v) => {
    if (`${v.vendorName} ${v.serviceType}`.toLowerCase().includes(q)) {
      results.push({ type: "Vendor", id: v.id, title: v.vendorName, subtitle: v.serviceType, route: `/vendors/${v.id}` });
    }
  });

  res.json({ data: results.slice(0, 30) });
});

module.exports = router;
