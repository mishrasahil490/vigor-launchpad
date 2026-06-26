const express = require("express");
const db = require("../db");
const { authenticate, authorize, scopeToUser } = require("../middleware/auth");

/**
 * Builds a standard REST router (list/get/create/update/delete) for a table.
 * @param {string} table - JSON table name
 * @param {object} opts
 *   - ownerField: field name used to scope Employee visibility (default "ownerId")
 *   - writeRoles: roles allowed to create/update/delete (default: Super Admin, Manager)
 *   - searchFields: fields included in the `?q=` free text search
 */
function crudRouter(table, opts = {}) {
  const router = express.Router();
  const ownerField = opts.ownerField || "ownerId";
  const writeRoles = opts.writeRoles || ["Super Admin", "Manager"];
  const searchFields = opts.searchFields || [];

  router.use(authenticate);

  router.get("/", (req, res) => {
    let rows = db.all(table);
    rows = scopeToUser(req, rows, ownerField);

    const { q, status, ...filters } = req.query;

    if (status) {
      rows = rows.filter((r) => String(r.status).toLowerCase() === String(status).toLowerCase());
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === "") return;
      rows = rows.filter((r) => {
        if (r[key] === undefined || r[key] === null) return false; // BUG 3 FIX: was `return true` — unknown field should exclude, not pass
        if (typeof r[key] === "number") return Number(r[key]) === Number(value);
        return String(r[key]).toLowerCase().includes(String(value).toLowerCase());
      });
    });

    if (q && searchFields.length) {
      const needle = String(q).toLowerCase();
      rows = rows.filter((r) =>
        searchFields.some((f) => String(r[f] || "").toLowerCase().includes(needle))
      );
    }

    res.json({ data: rows, total: rows.length });
  });

  router.get("/:id", (req, res) => {
    const row = db.getById(table, req.params.id);
    if (!row) return res.status(404).json({ error: `${table} record not found.` });
    res.json({ data: row });
  });

  router.post("/", authorize(...writeRoles, ...(opts.allowEmployeeCreate ? ["Employee"] : [])), (req, res) => {
    const row = db.insert(table, req.body, req.user);
    res.status(201).json({ data: row });
  });

  router.post("/bulk", authorize(...writeRoles, ...(opts.allowEmployeeCreate ? ["Employee"] : [])), (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: `Expected a non-empty array of ${table} records.` });
    }
    const inserted = [];
    const errors = [];
    records.forEach((record, i) => {
      try {
        const row = db.insert(table, record, req.user);
        inserted.push(row);
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    });
    res.status(201).json({ inserted: inserted.length, errors });
  });

  router.put("/:id", (req, res) => {
    const existing = db.getById(table, req.params.id);
    if (!existing) return res.status(404).json({ error: `${table} record not found.` });

    const isOwner = existing[ownerField] === req.user.id || existing[ownerField] === req.user.name;
    const canWrite = writeRoles.includes(req.user.role) || (opts.allowEmployeeEdit && isOwner);
    if (!canWrite) return res.status(403).json({ error: "You do not have permission to edit this record." });

    const row = db.update(table, req.params.id, req.body, req.user);
    res.json({ data: row });
  });

  router.delete("/:id", authorize(...writeRoles), (req, res) => {
    const ok = db.remove(table, req.params.id);
    if (!ok) return res.status(404).json({ error: `${table} record not found.` });
    res.status(204).end();
  });

  return router;
}

module.exports = crudRouter;
