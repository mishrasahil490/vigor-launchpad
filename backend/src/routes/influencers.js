const express = require("express");
const db = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// Advanced filtering: category, city, min/max followers, min engagement, language, budget range
router.get("/", (req, res) => {
  let rows = db.all("influencers");
  const { q, category, tier, city, language, gender, minFollowers, maxFollowers, minEngagement, maxBudget } = req.query;

  if (category) rows = rows.filter((r) => r.category.toLowerCase() === category.toLowerCase());
  if (tier) rows = rows.filter((r) => r.tier.toLowerCase() === tier.toLowerCase());
  if (city) rows = rows.filter((r) => r.location.toLowerCase().includes(city.toLowerCase()));
  if (language) rows = rows.filter((r) => r.language.toLowerCase().includes(language.toLowerCase()));
  if (gender) rows = rows.filter((r) => r.gender.toLowerCase() === gender.toLowerCase());
  if (minFollowers) rows = rows.filter((r) => r.followers >= Number(minFollowers));
  if (maxFollowers) rows = rows.filter((r) => r.followers <= Number(maxFollowers));
  if (minEngagement) rows = rows.filter((r) => r.engagementRate >= Number(minEngagement));
  if (maxBudget) rows = rows.filter((r) => r.commercialCost <= Number(maxBudget));
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.creatorName.toLowerCase().includes(needle) ||
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

router.post("/", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.insert("influencers", req.body);
  res.status(201).json({ data: row });
});

router.put("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const row = db.update("influencers", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Influencer not found." });
  res.json({ data: row });
});

router.delete("/:id", authorize("Super Admin", "Manager"), (req, res) => {
  const ok = db.remove("influencers", req.params.id);
  if (!ok) return res.status(404).json({ error: "Influencer not found." });
  res.status(204).end();
});

// Saved lists ("creator lists") so managers can build & reuse shortlists
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

module.exports = router;
