// run_migration.js — Execute Vigor Space SQL via Supabase Management API
require("dotenv").config();
const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://xxx.supabase.co
const SERVICE_KEY = process.env.SUPABASE_KEY;

// Extract project ref from URL: https://PROJECTREF.supabase.co
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];

const SQL = `
CREATE TABLE IF NOT EXISTS vigor_zones (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Table: vigor_states (new)
CREATE TABLE IF NOT EXISTS vigor_states (
  id bigserial PRIMARY KEY,
  zone_id bigint REFERENCES vigor_zones(id) ON DELETE CASCADE,
  state_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  history jsonb DEFAULT '[]'::jsonb
);

-- Table: vigor_cities (FK to zones and states)
CREATE TABLE IF NOT EXISTS vigor_cities (
  id bigserial PRIMARY KEY,
  zone_id bigint REFERENCES vigor_zones(id) ON DELETE CASCADE,
  state_id bigint REFERENCES vigor_states(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  history jsonb DEFAULT '[]'::jsonb
);

-- Alter existing vigor_cities table in case it already exists without state_id and audit columns
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS state_id bigint REFERENCES vigor_states(id) ON DELETE CASCADE;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS vigor_colleges (
  id bigserial PRIMARY KEY,
  zone_id bigint REFERENCES vigor_zones(id),
  city_id bigint REFERENCES vigor_cities(id) ON DELETE CASCADE,
  college_name text NOT NULL,
  type text,
  stream text,
  category text,
  naac_grade text,
  main_fest_name text,
  fest_type text,
  duration_days text,
  usual_period text,
  estimated_footfall text,
  source text,
  verified text DEFAULT 'No',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  history jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS vigor_college_pocs (
  id bigserial PRIMARY KEY,
  college_id bigint REFERENCES vigor_colleges(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation_role text,
  department_fest_name text,
  phone_number text,
  instagram_linkedin text,
  email_id text,
  source text,
  verified text DEFAULT 'No',
  date_added text,
  done_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  history jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vigor_states_zone ON vigor_states(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_cities_state ON vigor_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_vigor_cities_zone ON vigor_cities(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_city ON vigor_colleges(city_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_zone ON vigor_colleges(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_pocs_college ON vigor_college_pocs(college_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_name ON vigor_colleges(college_name);
CREATE INDEX IF NOT EXISTS idx_vigor_pocs_name ON vigor_college_pocs(name);
`;

function post(path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "api.supabase.com",
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`🚀 Running Vigor Space migration on project: ${projectRef}\n`);

  const result = await post(
    `/v1/projects/${projectRef}/database/query`,
    { query: SQL },
    SERVICE_KEY
  );

  if (result.status === 200 || result.status === 201) {
    console.log("✅ Migration successful! All 4 tables created.");
    console.log("   vigor_zones, vigor_cities, vigor_colleges, vigor_college_pocs");
  } else {
    console.error(`❌ Migration failed (HTTP ${result.status}):`);
    console.error(JSON.stringify(result.body, null, 2));
    console.log("\n📋 Please run vigor_space_migration.sql manually in the Supabase SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/" + projectRef + "/sql");
  }
}

run().catch(console.error);
