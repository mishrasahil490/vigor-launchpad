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
  "campaigns", "campaignInfluencers", "deliverables", "vendors", "events",
  "eventVendors", "eventInfluencers", "eventSponsors", "tasks", "invoices",
  "vendorPayments", "expenses", "notifications", "documents"
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
  campaignInfluencers: "campaign_influencers",
  influencerLists: "influencer_lists",
  eventInfluencers: "event_influencers",
  eventSponsors: "event_sponsors",
  eventVendors: "event_vendors",
  vendorPayments: "vendor_payments",
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
      console.warn("⚠️ Supabase client not initialized. Working in local-only mock mode.");
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

  insert(table, record) {
    const rows = cache[table] || [];
    const now = new Date().toISOString();
    const row = { id: nextId(rows), createdAt: now, updatedAt: now, ...record };
    rows.push(row);
    cache[table] = rows;
    
    // Save asynchronously to Supabase
    saveToSupabase(table, row);
    
    if (!supabase) {
      notifyChange(table, "INSERT", row.id);
    }
    
    return row;
  },

  update(table, id, patch) {
    const rows = cache[table] || [];
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    
    rows[idx] = { 
      ...rows[idx], 
      ...patch, 
      id: rows[idx].id, 
      updatedAt: new Date().toISOString() 
    };
    cache[table] = rows;
    
    // Save asynchronously to Supabase
    saveToSupabase(table, rows[idx]);
    
    if (!supabase) {
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
      notifyChange(table, "DELETE", Number(id));
    }
    
    return true;
  },

  async replaceAll(table, rows) {
    cache[table] = rows;
    if (!supabase) return;
    
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
  }
};

db.supabase = supabase;

module.exports = db;
