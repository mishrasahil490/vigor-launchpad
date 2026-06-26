const express = require("express");
const db = require("../db");
const { authenticate, authorize, scopeToUser } = require("../middleware/auth");
const crudRouter = require("./crudFactory");

const router = express.Router();

router.use(
  "/",
  crudRouter("leads", {
    ownerField: "ownerId",
    writeRoles: ["Super Admin", "Manager"],
    allowEmployeeEdit: true,
    searchFields: ["leadName", "companyName", "contactPerson", "email", "industry", "brandName", "pocName"],
  })
);

// Bulk import with duplicate detection
router.post("/bulk", authenticate, authorize("Super Admin", "Manager"), (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty array of lead records." });
  }
  const inserted = [];
  const errors = [];
  const duplicates = [];
  const existingLeads = db.all("leads");

  records.forEach((record, i) => {
    try {
      // Duplicate detection: match by email OR contactNumber (if both non-empty)
      const emailNorm = (record.email || "").trim().toLowerCase();
      const phoneNorm = (record.contactNumber || record.phone || "").trim();

      const isDuplicate = existingLeads.some((l) => {
        if (emailNorm && l.email && l.email.trim().toLowerCase() === emailNorm) return true;
        if (phoneNorm && l.contactNumber && l.contactNumber.trim() === phoneNorm) return true;
        return false;
      });

      if (isDuplicate) {
        duplicates.push({ row: i + 1, reason: `Lead with email "${emailNorm || phoneNorm}" already exists.` });
        return;
      }

      // Normalize field names from CSV mapping variants
      const clean = {
        ...record,
        contactNumber: record.contactNumber || record.phone || "",
        leadSource: record.leadSource || record.source || "",
        estimatedBudget: Number(record.estimatedBudget || record.estimatedValue || 0),
        status: record.status || "New",
      };
      // Remove aliased keys to avoid clutter
      delete clean.phone;
      delete clean.source;
      delete clean.estimatedValue;

      const row = db.insert("leads", clean, req.user);
      inserted.push(row);
      // Add to local list so subsequent rows in the same import can also deduplicate
      existingLeads.push(row);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  });
  res.status(201).json({ inserted: inserted.length, duplicates: duplicates.length, duplicateDetails: duplicates, errors });
});

// Activity timeline / notes for a single lead
router.get("/:id/activity", authenticate, (req, res) => {
  const items = db.find("activities", (a) => a.entityType === "lead" && a.entityId === Number(req.params.id));
  res.json({ data: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

router.post("/:id/activity", authenticate, (req, res) => {
  const lead = db.getById("leads", req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  const entry = db.insert("activities", {
    entityType: "lead",
    entityId: Number(req.params.id),
    type: req.body.type || "Note",
    message: req.body.message || "",
    authorName: req.user.name,
  });
  res.status(201).json({ data: entry });
});

// Convert a qualified lead into a client record
router.post("/:id/convert", authenticate, authorize("Super Admin", "Manager"), (req, res) => {
  const lead = db.getById("leads", req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found." });

  const client = db.insert("clients", {
    brandName: lead.companyName,
    contactPerson: lead.contactPerson,
    designation: req.body.designation || "",
    email: lead.email,
    phone: lead.phoneNumber,
    industry: lead.industry,
    gstNumber: req.body.gstNumber || "",
    billingAddress: req.body.billingAddress || "",
    accountManager: req.body.accountManager || lead.ownerName || "",
    status: "Active",
    convertedFromLeadId: lead.id,
  }, req.user);

  db.update("leads", lead.id, { status: "Won", convertedClientId: client.id }, req.user);

  res.status(201).json({ data: client });
});

module.exports = router;
