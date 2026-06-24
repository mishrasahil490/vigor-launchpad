/**
 * Cached database driver powered by Supabase.
 * Loads all data into memory at startup to keep REST endpoints fully synchronous
 * while maintaining persistent replication back to a Supabase database.
 */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl !== "YOUR_SUPABASE_PROJECT_URL" && supabaseKey !== "YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY") {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Supabase credentials not configured in .env. Running in offline/fallback mode (reads/writes in-memory only).");
}

function saveLocalTable(table) {
  if (supabase) return;
  const fs = require("fs");
  const path = require("path");
  const DATA_DIR = path.join(__dirname, "..", "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const fp = path.join(DATA_DIR, `${table}.json`);
  fs.writeFileSync(fp, JSON.stringify(cache[table] || [], null, 2), "utf-8");
}


// In-memory cache
const changeListeners = [];

function notifyChange(table, eventType, id) {
  changeListeners.forEach((cb) => {
    try {
      cb({ table, eventType, id });
    } catch (err) {
      console.error("Change listener error:", err);
    }
  });
}

const cache = {};
const tables = [
  "users", "leads", "activities", "clients", "influencers", "influencerLists",
  "campaigns", "campaignShortlist", "vendors", "events",
  "eventVendors", "eventInfluencers", "eventSponsors", "tasks", "invoices",
  "vendorPayments", "expenses", "notifications", "documents", "comments", "taskComments",
  "vigorZones", "vigorStates", "vigorCities", "vigorColleges", "vigorCollegePocs"
];

tables.forEach((t) => {
  cache[t] = [];
});

// Helper for mapping camelCase properties in Node to snake_case in Supabase PostgreSQL
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str) {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", "")
  );
}

const tableMap = {
  campaignShortlist: "campaign_shortlist",
  influencerLists: "influencer_lists",
  eventInfluencers: "event_influencers",
  eventSponsors: "event_sponsors",
  eventVendors: "event_vendors",
  vendorPayments: "vendor_payments",
  vigorZones: "vigor_zones",
  vigorStates: "vigor_states",
  vigorCities: "vigor_cities",
  vigorColleges: "vigor_colleges",
  vigorCollegePocs: "vigor_college_pocs",
};

function getSupabaseTableName(table) {
  return tableMap[table] || toSnakeCase(table);
}

function mapToDb(record) {
  if (!record || typeof record !== "object") return record;
  const dbRecord = {};
  for (const [key, val] of Object.entries(record)) {
    const dbKey = toSnakeCase(key);
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      dbRecord[dbKey] = mapToDb(val);
    } else {
      dbRecord[dbKey] = val;
    }
  }
  return dbRecord;
}

function mapFromDb(dbRecord) {
  if (!dbRecord || typeof dbRecord !== "object") return dbRecord;
  const record = {};
  for (const [key, val] of Object.entries(dbRecord)) {
    const camelKey = toCamelCase(key);
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      record[camelKey] = mapFromDb(val);
    } else {
      record[camelKey] = val;
    }
  }
  return record;
}

function nextId(rows) {
  return rows.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
}

// ─── Default Permissions by Role ────────────────────────────────────────────
const ENTITIES = ["leads", "clients", "influencers", "campaigns", "events", "vendors", "tasks", "finance", "reports"];

function defaultPermissions(role) {
  if (role === "Super Admin") {
    // Super Admin always has full access — permissions object is irrelevant but kept for consistency
    const actions = {};
    ENTITIES.forEach((e) => {
      actions[e] = { view: true, create: true, edit: true, delete: true, exportCSV: true };
    });
    return {
      pages: ["dashboard", "leads", "clients", "influencers", "campaigns", "events", "vendors", "tasks", "finance", "reports", "vigor-space", "settings"],
      vigorSpace: { canViewZones: "*", canManageZones: true, canExportCSV: true },
      actions,
    };
  }
  if (role === "Manager") {
    const actions = {};
    ENTITIES.forEach((e) => {
      actions[e] = { view: true, create: true, edit: true, delete: false, exportCSV: true };
    });
    return {
      pages: ["dashboard", "leads", "clients", "influencers", "campaigns", "events", "vendors", "tasks", "finance", "reports", "vigor-space"],
      vigorSpace: { canViewZones: "*", canManageZones: true, canExportCSV: true },
      actions,
    };
  }
  if (role === "Finance") {
    const actions = {};
    ENTITIES.forEach((e) => {
      actions[e] = { view: e === "finance" || e === "clients" || e === "vendors" || e === "reports", create: e === "finance", edit: e === "finance", delete: false, exportCSV: e === "finance" || e === "reports" };
    });
    return {
      pages: ["dashboard", "clients", "vendors", "finance", "reports"],
      vigorSpace: { canViewZones: "*", canManageZones: false, canExportCSV: false },
      actions,
    };
  }
  // Employee default
  const actions = {};
  ENTITIES.forEach((e) => {
    actions[e] = { view: e !== "finance", create: e === "tasks" || e === "leads", edit: e === "tasks", delete: false, exportCSV: false };
  });
  return {
    pages: ["dashboard", "leads", "clients", "influencers", "campaigns", "events", "tasks", "vigor-space"],
    vigorSpace: { canViewZones: "*", canManageZones: false, canExportCSV: false },
    actions,
  };
}

const pendingPromises = [];

function saveToSupabase(table, record) {
  if (!supabase) return;
  const dbTable = getSupabaseTableName(table);
  const dbRecord = mapToDb(record);
  
  const promise = supabase
    .from(dbTable)
    .upsert(dbRecord)
    .then(({ error }) => {
      if (error) {
        console.error(`Error upserting to Supabase table ${dbTable}:`, error.message);
      }
    })
    .catch((err) => {
      console.error(`Failed connection when upserting to Supabase table ${dbTable}:`, err);
    });
    
  pendingPromises.push(promise);
}

function deleteFromSupabase(table, id) {
  if (!supabase) return;
  const dbTable = getSupabaseTableName(table);
  
  const promise = supabase
    .from(dbTable)
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        console.error(`Error deleting from Supabase table ${dbTable}:`, error.message);
      }
    })
    .catch((err) => {
      console.error(`Failed connection when deleting from Supabase table ${dbTable}:`, err);
    });
    
  pendingPromises.push(promise);
}

const db = {
  // Initialize and load all tables from Supabase into memory
  async init() {
    if (!supabase) {
      console.warn("⚠️ Supabase client not initialized. Working in local-only mock mode with JSON file persistence.");
      const fs = require("fs");
      const path = require("path");
      const DATA_DIR = path.join(__dirname, "..", "data");
      for (const table of tables) {
        const fp = path.join(DATA_DIR, `${table}.json`);
        if (fs.existsSync(fp)) {
          try {
            const raw = fs.readFileSync(fp, "utf-8");
            cache[table] = JSON.parse(raw || "[]");
            console.log(`  Loaded ${cache[table].length} rows for "${table}" from local JSON`);
          } catch (err) {
            console.error(`Error parsing local file for ${table}:`, err);
            cache[table] = [];
          }
        } else {
          cache[table] = [];
        }
      }
      return;
    }
    
    console.log("🔄 Loading database cache from Supabase...");
    for (const table of tables) {
      const dbTable = getSupabaseTableName(table);
      try {
        const { data, error } = await supabase
          .from(dbTable)
          .select("*")
          .order("id", { ascending: true });
          
        if (error) {
          console.error(`Error fetching table "${dbTable}" from Supabase:`, error.message);
          cache[table] = [];
        } else {
          cache[table] = (data || []).map(mapFromDb);
          console.log(`  Loaded ${cache[table].length} rows for "${table}"`);
        }
      } catch (err) {
        console.error(`Failed to load table "${dbTable}" from Supabase:`, err);
        cache[table] = [];
      }
    }
    console.log("✅ Supabase cache initialization complete.");

    // Subscribe to Postgres Changes for all tables
    console.log("📡 Subscribing to Supabase Realtime changes...");
    supabase
      .channel("supabase-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        (payload) => {
          const dbTable = payload.table;
          const table = Object.keys(tableMap).find(key => tableMap[key] === dbTable) || 
                        tables.find(t => toSnakeCase(t) === dbTable) || 
                        dbTable;
                        
          console.log(`🔔 Realtime change received: ${payload.eventType} on ${table}`);
          
          let row = null;
          if (payload.eventType === "INSERT") {
            row = mapFromDb(payload.new);
            const rows = cache[table] || [];
            if (!rows.some(r => r.id === row.id)) {
              rows.push(row);
            }
          } else if (payload.eventType === "UPDATE") {
            row = mapFromDb(payload.new);
            const rows = cache[table] || [];
            const idx = rows.findIndex(r => r.id === row.id);
            if (idx !== -1) {
              rows[idx] = row;
            } else {
              rows.push(row);
            }
          } else if (payload.eventType === "DELETE") {
            const rows = cache[table] || [];
            const idx = rows.findIndex(r => r.id === payload.old.id);
            if (idx !== -1) {
              rows.splice(idx, 1);
            }
          }
          
          notifyChange(table, payload.eventType, row?.id || payload.old?.id);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Supabase Realtime subscription status: ${status}`);
      });
  },

  // Wait for all background writes to Supabase to complete (useful for scripts)
  async flush() {
    if (pendingPromises.length > 0) {
      console.log(`🔄 Flushing ${pendingPromises.length} pending writes to Supabase...`);
      await Promise.all(pendingPromises);
      pendingPromises.length = 0;
      console.log("✅ DB Flush complete.");
    }
  },

  onChange(cb) {
    changeListeners.push(cb);
  },

  all(table) {
    return cache[table] || [];
  },

  find(table, predicate) {
    return (cache[table] || []).filter(predicate);
  },

  findOne(table, predicate) {
    return (cache[table] || []).find(predicate) || null;
  },

  getById(table, id) {
    return (cache[table] || []).find((r) => r.id === Number(id)) || null;
  },

  insert(table, record, user) {
    const rows = cache[table] || [];
    const now = new Date().toISOString();
    const row = { id: nextId(rows), createdAt: now, updatedAt: now, ...record };
    
    if (user) {
      const userName = user.name || user;
      row.createdBy = userName;
      row.updatedBy = userName;
      row.history = [
        {
          user: userName,
          action: "Created",
          timestamp: now
        }
      ];
    }
    
    rows.push(row);
    cache[table] = rows;
    
    // Save asynchronously to Supabase
    saveToSupabase(table, row);
    
    if (!supabase) {
      saveLocalTable(table);
      notifyChange(table, "INSERT", row.id);
    }
    
    return row;
  },

  update(table, id, patch, user) {
    const rows = cache[table] || [];
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    
    const existing = rows[idx];
    const now = new Date().toISOString();
    
    let history = Array.isArray(existing.history) ? [...existing.history] : [];
    let updatedBy = existing.updatedBy;
    
    if (user) {
      const userName = user.name || user;
      const changedFields = [];
      const ignoreKeys = ["id", "createdAt", "updatedAt", "createdBy", "updatedBy", "history"];
      Object.keys(patch).forEach((key) => {
        if (ignoreKeys.includes(key)) return;
        if (JSON.stringify(patch[key]) !== JSON.stringify(existing[key])) {
          // Format keys nicely
          const readableKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
          changedFields.push(readableKey);
        }
      });
      
      if (changedFields.length > 0) {
        history.push({
          user: userName,
          action: `Updated fields: ${changedFields.join(", ")}`,
          timestamp: now
        });
      } else {
        // If it's a generic change with no fields specified or same content
        history.push({
          user: userName,
          action: "Updated",
          timestamp: now
        });
      }
      updatedBy = userName;
    }
    
    rows[idx] = { 
      ...existing, 
      ...patch, 
      history,
      updatedBy,
      id: existing.id, 
      updatedAt: now 
    };
    cache[table] = rows;
    
    // Save asynchronously to Supabase
    saveToSupabase(table, rows[idx]);
    
    if (!supabase) {
      saveLocalTable(table);
      notifyChange(table, "UPDATE", rows[idx].id);
    }
    
    return rows[idx];
  },

  remove(table, id) {
    const rows = cache[table] || [];
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return false;
    
    rows.splice(idx, 1);
    cache[table] = rows;
    
    // Save asynchronously to Supabase
    deleteFromSupabase(table, Number(id));
    
    if (!supabase) {
      saveLocalTable(table);
      notifyChange(table, "DELETE", Number(id));
    }
    
    return true;
  },

  async replaceAll(table, rows) {
    cache[table] = rows;
    if (!supabase) {
      saveLocalTable(table);
      return;
    }
    
    const dbTable = getSupabaseTableName(table);
    const dbRows = rows.map(mapToDb);
    
    try {
      // First clear the table in Supabase
      const { error: deleteError } = await supabase
        .from(dbTable)
        .delete()
        .gt("id", 0);
        
      if (deleteError) {
        console.error(`Error clearing table ${dbTable} during replaceAll:`, deleteError.message);
      }
      
      // Then insert new rows
      if (dbRows.length > 0) {
        const { error: insertError } = await supabase
          .from(dbTable)
          .insert(dbRows);
          
        if (insertError) {
          console.error(`Error bulk inserting to ${dbTable}:`, insertError.message);
        }
      }
    } catch (err) {
      console.error(`Failed to replaceAll in ${dbTable}:`, err);
    }
  },
  defaultPermissions
};

db.supabase = supabase;

module.exports = db;
