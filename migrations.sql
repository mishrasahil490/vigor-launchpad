-- SQL Migration Script
-- Copy and paste this script into your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql/new)
-- and click "Run" to add the necessary columns and tables.

-- ============================================================================
-- 1. ADD COLUMNS FOR EDIT HISTORY & AUDIT LOGS TO ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS leads 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS vendors 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS influencers 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS clients 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS campaigns 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS events 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS tasks 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS invoices 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS vendor_payments 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS expenses 
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;


-- ============================================================================
-- 2. ADD COLUMNS FOR LEADS AND VENDORS
-- ============================================================================

-- Add new Lead columns
ALTER TABLE IF EXISTS leads
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS poc_name text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS linkedin_profile text;

-- Add new Vendor columns
ALTER TABLE IF EXISTS vendors
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS website_email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS school_permission text,
  ADD COLUMN IF NOT EXISTS college_permission text,
  ADD COLUMN IF NOT EXISTS man_power integer,
  ADD COLUMN IF NOT EXISTS fabrication text,
  ADD COLUMN IF NOT EXISTS comment text;


-- ============================================================================
-- 3. CREATE MISSING TABLES (vigor_states, campaign_shortlist, comments, task_comments)
-- ============================================================================

-- Table: vigor_states
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

-- Alter existing vigor_cities table to link to vigor_states
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS state_id bigint REFERENCES vigor_states(id) ON DELETE CASCADE;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE vigor_cities ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- Table: campaign_shortlist
CREATE TABLE IF NOT EXISTS campaign_shortlist (
  id bigserial PRIMARY KEY,
  campaign_id bigint REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id bigint REFERENCES influencers(id) ON DELETE CASCADE,
  note text,
  status text DEFAULT 'Shortlisted',
  added_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  updated_by text,
  history jsonb DEFAULT '[]'::jsonb
);

-- Table: comments
CREATE TABLE IF NOT EXISTS comments (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  message text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: task_comments
CREATE TABLE IF NOT EXISTS task_comments (
  id bigserial PRIMARY KEY,
  task_id bigint REFERENCES tasks(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vigor_states_zone ON vigor_states(zone_id);
CREATE INDEX IF NOT EXISTS idx_vigor_cities_state ON vigor_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_campaign_shortlist_campaign ON campaign_shortlist(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_shortlist_influencer ON campaign_shortlist(influencer_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Alter users table to support permissions JSONB column
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- Drop campaign_influencers and deliverables tables if they exist
DROP TABLE IF EXISTS campaign_influencers CASCADE;
DROP TABLE IF EXISTS deliverables CASCADE;
