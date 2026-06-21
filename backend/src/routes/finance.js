const express = require("express");
const db = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("Super Admin", "Finance", "Manager"));

// --- Invoices (client billing) ---
router.get("/invoices", (req, res) => {
  let rows = db.all("invoices");
  const { status, clientId } = req.query;
  if (status) rows = rows.filter((r) => r.status === status);
  if (clientId) rows = rows.filter((r) => r.clientId === Number(clientId));
  res.json({ data: rows, total: rows.length });
});

router.post("/invoices", (req, res) => {
  const row = db.insert("invoices", {
    status: "Unpaid",
    ...req.body,
  });
  res.status(201).json({ data: row });
});

router.put("/invoices/:id", (req, res) => {
  const row = db.update("invoices", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Invoice not found." });
  res.json({ data: row });
});

router.delete("/invoices/:id", (req, res) => {
  db.remove("invoices", req.params.id);
  res.status(204).end();
});

// --- Vendor payments ---
router.get("/vendor-payments", (req, res) => {
  let rows = db.all("vendorPayments");
  const { status, vendorId } = req.query;
  if (status) rows = rows.filter((r) => r.status === status);
  if (vendorId) rows = rows.filter((r) => r.vendorId === Number(vendorId));
  res.json({ data: rows, total: rows.length });
});

router.post("/vendor-payments", (req, res) => {
  const row = db.insert("vendorPayments", { status: "Pending", ...req.body });
  res.status(201).json({ data: row });
});

router.put("/vendor-payments/:id", (req, res) => {
  const row = db.update("vendorPayments", req.params.id, req.body);
  if (!row) return res.status(404).json({ error: "Vendor payment not found." });
  res.json({ data: row });
});

// --- Expenses (general campaign/event/operational costs) ---
router.get("/expenses", (req, res) => {
  res.json({ data: db.all("expenses") });
});
router.post("/expenses", (req, res) => {
  const row = db.insert("expenses", req.body);
  res.status(201).json({ data: row });
});

// --- Profitability & outstanding summary ---
router.get("/summary", (req, res) => {
  const invoices = db.all("invoices");
  const vendorPayments = db.all("vendorPayments");
  const expenses = db.all("expenses");
  const campaigns = db.all("campaigns");
  const events = db.all("events");

  const revenue = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collected = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + Number(i.amount || 0), 0);

  const vendorOutstanding = vendorPayments
    .filter((v) => v.status !== "Paid")
    .reduce((s, v) => s + Number(v.amount || 0), 0);
  const vendorPaid = vendorPayments.filter((v) => v.status === "Paid").reduce((s, v) => s + Number(v.amount || 0), 0);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const campaignSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const eventSpend = events.reduce((s, e) => s + Number(e.spend || 0), 0);

  res.json({
    data: {
      revenue,
      collected,
      outstanding,
      vendorPaid,
      vendorOutstanding,
      totalExpenses,
      campaignSpend,
      eventSpend,
      netProfit: revenue - totalExpenses - vendorPaid - campaignSpend - eventSpend,
    },
  });
});

module.exports = router;
