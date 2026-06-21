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
    searchFields: ["leadName", "companyName", "contactPerson", "email", "industry"],
  })
);

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
  });

  db.update("leads", lead.id, { status: "Won", convertedClientId: client.id });

  res.status(201).json({ data: client });
});

module.exports = router;
