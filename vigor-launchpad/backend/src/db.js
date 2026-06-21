/**
 * Lightweight file-backed JSON database.
 * Each "table" is a JSON file in /backend/data. This keeps the project
 * dependency-free (no native modules to compile) while still giving every
 * route real persistence, real IDs, and real query/filter/sort behaviour.
 *
 * Swap-out path: every function here maps 1:1 to what you'd write against
 * Postgres/Mongo, so migrating later means replacing this file only.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function filePath(table) {
  return path.join(DATA_DIR, `${table}.json`);
}

function ensureTable(table) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const fp = filePath(table);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, "[]", "utf-8");
}

function readTable(table) {
  ensureTable(table);
  const raw = fs.readFileSync(filePath(table), "utf-8");
  try {
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeTable(table, rows) {
  ensureTable(table);
  fs.writeFileSync(filePath(table), JSON.stringify(rows, null, 2), "utf-8");
}

function nextId(rows) {
  return rows.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
}

const db = {
  all(table) {
    return readTable(table);
  },
  find(table, predicate) {
    return readTable(table).filter(predicate);
  },
  findOne(table, predicate) {
    return readTable(table).find(predicate) || null;
  },
  getById(table, id) {
    return readTable(table).find((r) => r.id === Number(id)) || null;
  },
  insert(table, record) {
    const rows = readTable(table);
    const now = new Date().toISOString();
    const row = { id: nextId(rows), createdAt: now, updatedAt: now, ...record };
    rows.push(row);
    writeTable(table, rows);
    return row;
  },
  update(table, id, patch) {
    const rows = readTable(table);
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id: rows[idx].id, updatedAt: new Date().toISOString() };
    writeTable(table, rows);
    return rows[idx];
  },
  remove(table, id) {
    const rows = readTable(table);
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    writeTable(table, rows);
    return true;
  },
  replaceAll(table, rows) {
    writeTable(table, rows);
  },
};

module.exports = db;
