-- ============================================================================
-- Vigor Space — Community College Database Module
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- Table: vigor_zones (5 pre-seeded zones)
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

-- Table: vigor_colleges (FK to zones + cities)
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

-- Table: vigor_college_pocs (FK to colleges, one-to-many)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vigor_states_zone ON vigor_states(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_cities_state ON vigor_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_vigor_cities_zone ON vigor_cities(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_city ON vigor_colleges(city_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_zone ON vigor_colleges(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_pocs_college ON vigor_college_pocs(college_id);
CREATE INDEX IF NOT EXISTS idx_vigor_colleges_name ON vigor_colleges(college_name);
CREATE INDEX IF NOT EXISTS idx_vigor_pocs_name ON vigor_college_pocs(name);
