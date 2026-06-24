const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

function filterZonesForUser(req, zones) {
  if (req.user.role === "Super Admin" || req.user.role === "Manager") {
    return zones;
  }
  const allowed = req.user.permissions?.vigorSpace?.canViewZones || [];
  if (allowed === "*") return zones;
  if (!Array.isArray(allowed)) return [];
  return zones.filter(z => allowed.includes(z.name + " Zone") || allowed.includes(z.name));
}

// ─── Static seed data ───────────────────────────────────────────────────────
const ZONES_SEED = [
  { name: "North" },
  { name: "South" },
  { name: "East" },
  { name: "West" },
  { name: "Central" },
];

const STATE_CITIES_SEED = {
  North: {
    "Delhi": ["Delhi"],
    "Chandigarh": ["Chandigarh"],
    "Rajasthan": ["Jaipur"],
    "Uttar Pradesh": ["Lucknow", "Agra", "Varanasi", "Noida"],
    "Uttarakhand": ["Dehradun"],
    "Punjab": ["Amritsar"],
    "Haryana": ["Gurgaon"]
  },
  South: {
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru"],
    "Telangana": ["Hyderabad"],
    "Kerala": ["Kochi", "Trivandrum"],
    "Andhra Pradesh": ["Vizag"]
  },
  East: {
    "West Bengal": ["Kolkata", "Siliguri", "Durgapur"],
    "Odisha": ["Bhubaneswar", "Cuttack"],
    "Assam": ["Guwahati", "Silchar"],
    "Bihar": ["Patna"],
    "Jharkhand": ["Ranchi"]
  },
  West: {
    "Maharashtra": ["Mumbai", "Pune", "Nashik", "Navi Mumbai"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Madhya Pradesh": ["Indore"]
  },
  Central: {
    "Madhya Pradesh": ["Bhopal", "Jabalpur", "Ujjain", "Gwalior"],
    "Chhattisgarh": ["Raipur", "Bilaspur"]
  }
};

function findStateForCity(zoneName, cityName) {
  const zoneStates = STATE_CITIES_SEED[zoneName];
  if (!zoneStates) return "Other";
  for (const [state, cities] of Object.entries(zoneStates)) {
    if (cities.some(c => c.toLowerCase() === cityName.toLowerCase())) {
      return state;
    }
  }
  return "Other";
}

// Auto-seed zones, states & cities on first request
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  const zones = db.all("vigorZones");
  const states = db.all("vigorStates");

  if (zones.length === 0) {
    console.log("[VigorSpace] Seeding zones, states and cities...");
    for (const z of ZONES_SEED) {
      const zone = db.insert("vigorZones", { name: z.name });
      const zoneStates = STATE_CITIES_SEED[z.name] || {};
      for (const [stateName, citiesList] of Object.entries(zoneStates)) {
        const state = db.insert("vigorStates", { zoneId: zone.id, stateName });
        for (const city of citiesList) {
          db.insert("vigorCities", { zoneId: zone.id, stateId: state.id, cityName: city });
        }
      }
    }
    console.log("[VigorSpace] Zones, states & cities seeded ✓");
  } else if (states.length === 0) {
    console.log("[VigorSpace] Migrating existing database to add states...");
    const cities = db.all("vigorCities");
    const zoneMap = {};
    zones.forEach(z => zoneMap[z.id] = z.name);

    const stateCache = {};
    for (const city of cities) {
      const zoneName = zoneMap[city.zoneId] || "Other";
      const stateName = findStateForCity(zoneName, city.cityName);
      const cacheKey = `${city.zoneId}_${stateName}`;

      let state = stateCache[cacheKey];
      if (!state) {
        state = db.findOne("vigorStates", s => s.zoneId === city.zoneId && s.stateName === stateName);
        if (!state) {
          state = db.insert("vigorStates", { zoneId: city.zoneId, stateName });
        }
        stateCache[cacheKey] = state;
      }
      db.update("vigorCities", city.id, { stateId: state.id });
    }
    console.log("[VigorSpace] Migration to add states complete ✓");
  }

  // ── Cleanup: remove Maharashtra from Central zone (it belongs to West only) ─
  const centralZone = db.findOne("vigorZones", z => z.name === "Central");
  if (centralZone) {
    const mhStateCentral = db.findOne(
      "vigorStates",
      s => s.zoneId === centralZone.id && s.stateName === "Maharashtra"
    );
    if (mhStateCentral) {
      console.log("[VigorSpace] Removing Maharashtra from Central zone...");
      const mhCities = db.find("vigorCities", c => c.stateId === mhStateCentral.id && c.zoneId === centralZone.id);
      mhCities.forEach(c => db.remove("vigorCities", c.id));
      db.remove("vigorStates", mhStateCentral.id);
      console.log("[VigorSpace] Maharashtra removed from Central zone ✓");
    }
  }

  seeded = true;
}

// ─── GET /api/vigor-space/zones  ─────────────────────────────────────────────
router.get("/zones", async (req, res) => {
  try {
    await ensureSeeded();
    const allZones = db.all("vigorZones");
    const zones = filterZonesForUser(req, allZones);
    const cities = db.all("vigorCities");
    const colleges = db.all("vigorColleges");
    const pocs = db.all("vigorCollegePocs");

    const data = zones.map((zone) => {
      const zoneCities = cities.filter((c) => c.zoneId === zone.id);
      const zoneCityIds = new Set(zoneCities.map((c) => c.id));
      const zoneColleges = colleges.filter((c) => zoneCityIds.has(c.cityId));
      const zoneCollegeIds = new Set(zoneColleges.map((c) => c.id));
      const zonePocs = pocs.filter((p) => zoneCollegeIds.has(p.collegeId));
      return {
        ...zone,
        cityCount: zoneCities.length,
        collegeCount: zoneColleges.length,
        pocCount: zonePocs.length,
      };
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/vigor-space/zones/:id/cities  ──────────────────────────────────
router.get("/zones/:id/cities", async (req, res) => {
  try {
    await ensureSeeded();
    const zone = db.getById("vigorZones", req.params.id);
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const allowedZones = filterZonesForUser(req, [zone]);
    if (allowedZones.length === 0) {
      return res.status(403).json({ error: "Access denied to this zone." });
    }

    const allCities = db.find("vigorCities", (c) => c.zoneId === zone.id);
    const zoneStates = db.find("vigorStates", (s) => s.zoneId === zone.id);
    const colleges = db.all("vigorColleges");
    const pocs = db.all("vigorCollegePocs");

    const data = allCities.map((city) => {
      const cityColleges = colleges.filter((c) => c.cityId === city.id);
      const cityCollegeIds = new Set(cityColleges.map((c) => c.id));
      const cityPocs = pocs.filter((p) => cityCollegeIds.has(p.collegeId));
      return { ...city, collegeCount: cityColleges.length, pocCount: cityPocs.length };
    });

    res.json({ data, states: zoneStates, zone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/vigor-space/zones/:id/states  ─────────────────────────────────
router.post("/zones/:id/states", async (req, res) => {
  try {
    await ensureSeeded();
    const zone = db.getById("vigorZones", req.params.id);
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const { stateName } = req.body;
    if (!stateName?.trim()) return res.status(400).json({ error: "State name is required." });

    const existing = db.findOne(
      "vigorStates",
      (s) => s.zoneId === zone.id && s.stateName.toLowerCase() === stateName.trim().toLowerCase()
    );
    if (existing) return res.status(409).json({ error: `"${stateName}" already exists in ${zone.name} Zone.` });

    const state = db.insert("vigorStates", { zoneId: zone.id, stateName: stateName.trim() }, req.user);
    res.status(201).json({ data: state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/vigor-space/states/:id  ─────────────────────────────────────
router.delete("/states/:id", async (req, res) => {
  try {
    const state = db.getById("vigorStates", req.params.id);
    if (!state) return res.status(404).json({ error: "State not found." });

    // Cascade: remove all cities in this state, and their colleges + POCs
    const stateCities = db.find("vigorCities", (c) => c.stateId === state.id);
    for (const city of stateCities) {
      const cityColleges = db.find("vigorColleges", (c) => c.cityId === city.id);
      for (const college of cityColleges) {
        db.find("vigorCollegePocs", (p) => p.collegeId === college.id)
          .forEach((p) => db.remove("vigorCollegePocs", p.id));
        db.remove("vigorColleges", college.id);
      }
      db.remove("vigorCities", city.id);
    }
    db.remove("vigorStates", state.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/vigor-space/zones/:id/cities  ─────────────────────────────────
router.post("/zones/:id/cities", async (req, res) => {
  try {
    await ensureSeeded();
    const zone = db.getById("vigorZones", req.params.id);
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const { cityName, stateId } = req.body;
    if (!cityName?.trim()) return res.status(400).json({ error: "City name is required." });
    if (!stateId) return res.status(400).json({ error: "State is required." });

    const state = db.getById("vigorStates", stateId);
    if (!state || state.zoneId !== zone.id) return res.status(404).json({ error: "State not found in this zone." });

    // Prevent duplicates within the same zone
    const existing = db.findOne(
      "vigorCities",
      (c) => c.zoneId === zone.id && c.cityName.toLowerCase() === cityName.trim().toLowerCase()
    );
    if (existing) return res.status(409).json({ error: `"${cityName}" already exists in ${zone.name} Zone.` });

    const city = db.insert("vigorCities", { zoneId: zone.id, stateId: Number(stateId), cityName: cityName.trim() }, req.user);
    res.status(201).json({ data: { ...city, collegeCount: 0, pocCount: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/vigor-space/cities/:id  ─────────────────────────────────────
router.delete("/cities/:id", async (req, res) => {
  try {
    const city = db.getById("vigorCities", req.params.id);
    if (!city) return res.status(404).json({ error: "City not found." });

    // Cascade: remove all colleges in this city, and their POCs
    const cityColleges = db.find("vigorColleges", (c) => c.cityId === city.id);
    for (const college of cityColleges) {
      db.find("vigorCollegePocs", (p) => p.collegeId === college.id)
        .forEach((p) => db.remove("vigorCollegePocs", p.id));
      db.remove("vigorColleges", college.id);
    }
    db.remove("vigorCities", city.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/vigor-space/cities/:id/colleges  ───────────────────────────────
router.get("/cities/:id/colleges", async (req, res) => {
  try {
    await ensureSeeded();
    const city = db.getById("vigorCities", req.params.id);
    if (!city) return res.status(404).json({ error: "City not found." });

    const zone = db.getById("vigorZones", city.zoneId);
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const allowedZones = filterZonesForUser(req, [zone]);
    if (allowedZones.length === 0) {
      return res.status(403).json({ error: "Access denied to this zone." });
    }

    let colleges = db.find("vigorColleges", (c) => c.cityId === city.id);
    const pocs = db.all("vigorCollegePocs");

    // Apply filters
    const { q, type, stream, naacGrade, verified } = req.query;
    if (q) colleges = colleges.filter((c) => c.collegeName?.toLowerCase().includes(q.toLowerCase()) || c.mainFestName?.toLowerCase().includes(q.toLowerCase()));
    if (type) colleges = colleges.filter((c) => c.type === type);
    if (stream) colleges = colleges.filter((c) => c.stream === stream);
    if (naacGrade) colleges = colleges.filter((c) => c.naacGrade === naacGrade);
    if (verified) colleges = colleges.filter((c) => c.verified === verified);

    const data = colleges.map((college) => ({
      ...college,
      pocCount: pocs.filter((p) => p.collegeId === college.id).length,
    }));

    res.json({ data, city, zone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/vigor-space/colleges/:id  ──────────────────────────────────────
router.get("/colleges/:id", (req, res) => {
  const college = db.getById("vigorColleges", req.params.id);
  if (!college) return res.status(404).json({ error: "College not found." });

  const city = db.getById("vigorCities", college.cityId);
  const zone = city ? db.getById("vigorZones", city.zoneId) : null;

  if (zone) {
    const allowedZones = filterZonesForUser(req, [zone]);
    if (allowedZones.length === 0) {
      return res.status(403).json({ error: "Access denied to this zone." });
    }
  }

  const pocs = db.find("vigorCollegePocs", (p) => p.collegeId === college.id);

  res.json({ data: { ...college, pocs, city, zone } });
});

// ─── POST /api/vigor-space/colleges  ─────────────────────────────────────────
router.post("/colleges", (req, res) => {
  try {
    const row = db.insert("vigorColleges", req.body, req.user);
    res.status(201).json({ data: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/vigor-space/colleges/:id  ──────────────────────────────────────
router.put("/colleges/:id", (req, res) => {
  const row = db.update("vigorColleges", req.params.id, req.body, req.user);
  if (!row) return res.status(404).json({ error: "College not found." });
  res.json({ data: row });
});

// ─── DELETE /api/vigor-space/colleges/:id  ───────────────────────────────────
router.delete("/colleges/:id", (req, res) => {
  // Delete associated POCs first
  db.find("vigorCollegePocs", (p) => p.collegeId === Number(req.params.id))
    .forEach((p) => db.remove("vigorCollegePocs", p.id));
  const ok = db.remove("vigorColleges", req.params.id);
  if (!ok) return res.status(404).json({ error: "College not found." });
  res.status(204).end();
});

// ─── POST /api/vigor-space/colleges/:id/pocs  ────────────────────────────────
router.post("/colleges/:id/pocs", (req, res) => {
  try {
    const college = db.getById("vigorColleges", req.params.id);
    if (!college) return res.status(404).json({ error: "College not found." });

    const row = db.insert(
      "vigorCollegePocs",
      { ...req.body, collegeId: college.id, doneBy: req.user?.name || "System" },
      req.user
    );
    res.status(201).json({ data: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/vigor-space/pocs/:id  ──────────────────────────────────────────
router.put("/pocs/:id", (req, res) => {
  const row = db.update("vigorCollegePocs", req.params.id, req.body, req.user);
  if (!row) return res.status(404).json({ error: "POC not found." });
  res.json({ data: row });
});

// ─── DELETE /api/vigor-space/pocs/:id  ───────────────────────────────────────
router.delete("/pocs/:id", (req, res) => {
  const ok = db.remove("vigorCollegePocs", req.params.id);
  if (!ok) return res.status(404).json({ error: "POC not found." });
  res.status(204).end();
});

// ─── POST /api/vigor-space/bulk-import  ──────────────────────────────────────
router.post("/bulk-import", async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty array of records." });
  }
  await ensureSeeded();

  let collegesCreated = 0;
  let pocsCreated = 0;
  const errors = [];

  records.forEach((record, idx) => {
    try {
      // Find zone
      const zone = db.findOne(
        "vigorZones",
        (z) => z.name.toLowerCase() === (record.zone || "").toLowerCase()
      );
      if (!zone) throw new Error(`Zone "${record.zone}" not found.`);

      // Find or create city
      let city = db.findOne(
        "vigorCities",
        (c) => c.zoneId === zone.id && c.cityName.toLowerCase() === (record.city || "").toLowerCase()
      );
      if (!city) {
        const stateName = findStateForCity(zone.name, record.city || "");
        let state = db.findOne(
          "vigorStates",
          (s) => s.zoneId === zone.id && s.stateName.toLowerCase() === stateName.toLowerCase()
        );
        if (!state) {
          state = db.insert("vigorStates", { zoneId: zone.id, stateName });
        }
        city = db.insert("vigorCities", { zoneId: zone.id, stateId: state.id, cityName: record.city });
      }

      // Find or create college
      let college = db.findOne(
        "vigorColleges",
        (c) => c.cityId === city.id && c.collegeName?.toLowerCase() === (record.collegeName || "").toLowerCase()
      );
      if (!college) {
        college = db.insert(
          "vigorColleges",
          {
            cityId: city.id,
            zoneId: zone.id,
            collegeName: record.collegeName || "Unknown College",
            type: record.type || "",
            stream: record.stream || "",
            category: record.category || "",
            naacGrade: record.naacGrade || "",
            mainFestName: record.mainFestName || "",
            festType: record.festType || "",
            durationDays: record.durationDays || "",
            usualPeriod: record.usualPeriod || "",
            estimatedFootfall: record.estimatedFootfall || "",
            source: record.source || "",
            verified: record.verified || "No",
          },
          req.user
        );
        collegesCreated++;
      }

      // Create POC if name is provided
      if (record.pocName && college) {
        db.insert(
          "vigorCollegePocs",
          {
            collegeId: college.id,
            name: record.pocName,
            designationRole: record.designationRole || "",
            departmentFestName: record.departmentFestName || "",
            phoneNumber: record.phoneNumber || "",
            instagramLinkedin: record.instagramLinkedin || "",
            emailId: record.emailId || "",
            source: record.source || "",
            verified: record.verified || "No",
            dateAdded: record.dateAdded || new Date().toISOString().slice(0, 10),
            doneBy: req.user?.name || "Import",
          },
          req.user
        );
        pocsCreated++;
      }
    } catch (err) {
      errors.push({ row: idx + 1, error: err.message });
    }
  });

  res.status(201).json({ collegesCreated, pocsCreated, errors, total: records.length });
});

// ─── GET /api/vigor-space/search  ────────────────────────────────────────────
router.get("/search", async (req, res) => {
  await ensureSeeded();
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ data: [] });

  const needle = q.toLowerCase();
  const colleges = db.all("vigorColleges");
  const pocs = db.all("vigorCollegePocs");
  const cities = db.all("vigorCities");
  const allZones = db.all("vigorZones");
  const zones = filterZonesForUser(req, allZones);
  const zoneIds = new Set(zones.map((z) => z.id));

  const matchedColleges = colleges
    .filter(
      (c) =>
        (c.collegeName?.toLowerCase().includes(needle) ||
        c.mainFestName?.toLowerCase().includes(needle)) &&
        zoneIds.has(c.zoneId)
    )
    .slice(0, 10)
    .map((c) => {
      const city = cities.find((ci) => ci.id === c.cityId);
      const zone = zones.find((z) => z.id === c.zoneId);
      return { type: "college", ...c, cityName: city?.cityName, zoneName: zone?.name };
    });

  const matchedPocs = pocs
    .filter((p) => {
      if (
        !p.name?.toLowerCase().includes(needle) &&
        !p.phoneNumber?.includes(needle) &&
        !p.emailId?.toLowerCase().includes(needle)
      ) {
        return false;
      }
      const college = colleges.find((c) => c.id === p.collegeId);
      return college && zoneIds.has(college.zoneId);
    })
    .slice(0, 10)
    .map((p) => {
      const college = colleges.find((c) => c.id === p.collegeId);
      return { type: "poc", ...p, collegeName: college?.collegeName };
    });

  res.json({ data: [...matchedColleges, ...matchedPocs] });
});

// ─── GET /api/vigor-space/stats  ─────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  await ensureSeeded();
  const allZones = db.all("vigorZones");
  const zones = filterZonesForUser(req, allZones);
  const zoneIds = new Set(zones.map((z) => z.id));
  
  const cities = db.all("vigorCities").filter((c) => zoneIds.has(c.zoneId));
  const cityIds = new Set(cities.map((c) => c.id));
  
  const colleges = db.all("vigorColleges").filter((c) => cityIds.has(c.cityId));
  const collegeIds = new Set(colleges.map((c) => c.id));
  
  const pocs = db.all("vigorCollegePocs").filter((p) => collegeIds.has(p.collegeId));

  const byZone = zones.map((z) => {
    const zCities = cities.filter((c) => c.zoneId === z.id);
    const zCityIds = new Set(zCities.map((c) => c.id));
    const count = colleges.filter((c) => zCityIds.has(c.cityId)).length;
    return { name: z.name, count };
  });

  const streamMap = {};
  colleges.forEach((c) => {
    const s = c.stream || "Other";
    streamMap[s] = (streamMap[s] || 0) + 1;
  });

  res.json({
    data: {
      totalZones: zones.length,
      totalCities: cities.length,
      totalColleges: colleges.length,
      totalPocs: pocs.length,
      verified: colleges.filter((c) => c.verified === "Yes").length,
      unverified: colleges.filter((c) => c.verified !== "Yes").length,
      byZone,
      byStream: Object.entries(streamMap).map(([name, count]) => ({ name, count })),
    },
  });
});

module.exports = router;
