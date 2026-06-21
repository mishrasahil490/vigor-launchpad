const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const crudRouter = require("./crudFactory");

const router = express.Router();

router.use(
  "/",
  crudRouter("clients", {
    ownerField: "accountManagerId",
    writeRoles: ["Super Admin", "Manager"],
    searchFields: ["brandName", "contactPerson", "email", "industry"],
  })
);

// Roll-up: campaign history, documents, payment history for a single client
router.get("/:id/history", authenticate, (req, res) => {
  const clientId = Number(req.params.id);
  const campaigns = db.find("campaigns", (c) => c.clientId === clientId);
  const invoices = db.find("invoices", (i) => i.clientId === clientId);
  const documents = db.find("documents", (d) => d.entityType === "client" && d.entityId === clientId);
  res.json({ data: { campaigns, invoices, documents } });
});

module.exports = router;
