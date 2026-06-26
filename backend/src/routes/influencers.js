const express = require("express");
const db = require("../db");
const { authenticate, authorize, scopeToUser } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Advanced filtering: category, city, min/max followers, min engagement, language, budget range
router.get("/", (req, res) => {
  let rows = db.all("influencers");

  // Scope: Employees see only influencers they created or assigned to; Managers see their team's influencers; Super Admins see all
  const { role, name, id, team } = req.user;
  if (role === "Employee") {
    rows = rows.filter((r) => r.createdBy === name || r.ownerId === id || r.ownerName === name);
  } else if (role === "Manager") {
    const teamMembers = db.find("users", (u) => u.team === team);
    const teamMemberNames = teamMembers.map(u => u.name);
    const teamMemberIds = teamMembers.map(u => u.id);
    rows = rows.filter((r) => 
      teamMemberNames.includes(r.createdBy) || 
      teamMemberIds.includes(r.ownerId) || 
      (r.ownerName && teamMemberNames.includes(r.ownerName)) ||
      r.team === team
    );
  }

  const { q, category, tier, city, language, gender, minFollowers, maxFollowers, minEngagement, maxBudget, ownerId } = req.query;

  if (category) rows = rows.filter((r) => (r.category || "").toLowerCase() === category.toLowerCase());
  if (tier) rows = rows.filter((r) => (r.tier || "").toLowerCase() === tier.toLowerCase());
  if (city) rows = rows.filter((r) => (r.location || "").toLowerCase().includes(city.toLowerCase()));
  if (language) rows = rows.filter((r) => (r.language || "").toLowerCase().includes(language.toLowerCase()));
  if (gender) rows = rows.filter((r) => (r.gender || "").toLowerCase() === gender.toLowerCase());
  if (minFollowers) rows = rows.filter((r) => Number(r.followers || 0) >= Number(minFollowers));
  if (maxFollowers) rows = rows.filter((r) => Number(r.followers || 0) <= Number(maxFollowers));
  if (minEngagement) rows = rows.filter((r) => Number(r.engagementRate || 0) >= Number(minEngagement));
  if (maxBudget) rows = rows.filter((r) => Number(r.commercialCost || 0) <= Number(maxBudget));
  if (ownerId) {
    if (ownerId === "unassigned") {
      rows = rows.filter((r) => !r.ownerId);
    } else {
      rows = rows.filter((r) => String(r.ownerId) === String(ownerId));
    }
  }
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.creatorName || "").toLowerCase().includes(needle) ||
        (r.instagramHandle || "").toLowerCase().includes(needle) ||
        (r.category || "").toLowerCase().includes(needle)
    );
  }

  res.json({ data: rows, total: rows.length });
});

router.get("/:id", (req, res) => {
  const row = db.getById("influencers", req.params.id);
  if (!row) return res.status(404).json({ error: "Influencer not found." });
  res.json({ data: row });
});

router.post("/", (req, res) => {
  const data = { ...req.body };
  if (!data.ownerId && req.user.role === "Employee") {
    data.ownerId = req.user.id;
    data.ownerName = req.user.name;
  }
  const row = db.insert("influencers", data, req.user);
  res.status(201).json({ data: row });
});

// Bulk import from CSV
router.post("/bulk", authorize("Super Admin", "Manager"), (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty array of influencer records." });
  }
  const inserted = [];
  const errors = [];
  records.forEach((record, i) => {
    try {
      // Normalize numeric fields
      const clean = {
        ...record,
        followers: Number(record.followers) || 0,
        engagementRate: Number(record.engagementRate || record.engagement_rate) || 0,
        commercialCost: Number(record.commercialCost || record.commercial_cost) || 0,
        adRightsCost: Number(record.adRightsCost || record.ad_rights_cost) || 0,
        reelCost: Number(record.reelCost || record.reel_cost) || 0,
        storyCost: Number(record.storyCost || record.story_cost) || 0,
        eventAppearanceCost: Number(record.eventAppearanceCost || record.event_appearance_cost) || 0,
      };
      const row = db.insert("influencers", clean, req.user);
      inserted.push(row);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  });
  res.status(201).json({ inserted: inserted.length, errors });
});

router.put("/:id", (req, res) => {
  const existing = db.getById("influencers", req.params.id);
  if (!existing) return res.status(404).json({ error: "Influencer not found." });
  const { role, name, id } = req.user;
  if (role === "Employee" && existing.createdBy !== name && existing.ownerId !== id && existing.ownerName !== name) {
    return res.status(403).json({ error: "You can only edit influencers you created or are assigned to." });
  }
  const row = db.update("influencers", req.params.id, req.body, req.user);
  if (!row) return res.status(404).json({ error: "Influencer not found." });
  res.json({ data: row });
});

router.delete("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const ok = db.remove("influencers", req.params.id);
  if (!ok) return res.status(404).json({ error: "Influencer not found." });
  res.status(204).end();
});

// ─── Saved lists ("creator lists") so managers can build & reuse shortlists ──
router.get("/lists/all", (req, res) => {
  res.json({ data: db.all("influencerLists") });
});

router.post("/lists/all", (req, res) => {
  const list = db.insert("influencerLists", {
    name: req.body.name,
    influencerIds: req.body.influencerIds || [],
    createdBy: req.user.name,
  });
  res.status(201).json({ data: list });
});

router.delete("/lists/:id", (req, res) => {
  db.remove("influencerLists", req.params.id);
  res.status(204).end();
});

// ─── Campaign Shortlists ────────────────────────────────────────────────────
// GET /influencers/campaign-shortlist/:campaignId — fetch all shortlisted influencers for a campaign
router.get("/campaign-shortlist/:campaignId", (req, res) => {
  const campaignId = Number(req.params.campaignId);
  const shortlist = db.find("campaignShortlist", (s) => s.campaignId === campaignId);
  // Attach influencer details
  const result = shortlist.map((s) => {
    const inf = db.getById("influencers", s.influencerId);
    return { ...s, influencer: inf || null };
  });
  res.json({ data: result });
});

// POST /influencers/campaign-shortlist/:campaignId — add influencer to shortlist
router.post("/campaign-shortlist/:campaignId", (req, res) => {
  const campaignId = Number(req.params.campaignId);
  const { influencerId, note } = req.body;
  if (!influencerId) return res.status(400).json({ error: "influencerId is required." });

  // Check for duplicate
  const existing = db.findOne("campaignShortlist", (s) => s.campaignId === campaignId && s.influencerId === Number(influencerId));
  if (existing) return res.status(409).json({ error: "Influencer already shortlisted for this campaign." });

  const row = db.insert("campaignShortlist", {
    campaignId,
    influencerId: Number(influencerId),
    note: note || "",
    status: "Shortlisted",
    addedBy: req.user.name,
  });
  res.status(201).json({ data: row });
});

// PUT /influencers/campaign-shortlist/:campaignId/:shortlistId — update shortlist entry (status/note)
router.put("/campaign-shortlist/:campaignId/:shortlistId", (req, res) => {
  const row = db.update("campaignShortlist", req.params.shortlistId, req.body);
  if (!row) return res.status(404).json({ error: "Shortlist entry not found." });
  res.json({ data: row });
});

// DELETE /influencers/campaign-shortlist/:campaignId/:shortlistId — remove from shortlist
router.delete("/campaign-shortlist/:campaignId/:shortlistId", (req, res) => {
  db.remove("campaignShortlist", req.params.shortlistId);
  res.status(204).end();
});

module.exports = router;
