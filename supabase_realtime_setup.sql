-- ============================================================================
-- Vigor Launchpad — Supabase Realtime Setup (Idempotent Version)
-- ============================================================================
-- Run this SQL in your Supabase project SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- This script is safe to re-run multiple times. It adds each table to the
-- supabase_realtime publication only if it is not already a member,
-- avoiding the ERROR 42710 "already member" failure.
-- ============================================================================

DO $$
DECLARE
  tables_to_add text[] := ARRAY[
    'leads',
    'users',
    'clients',
    'influencers',
    'influencer_lists',
    'campaigns',
    'campaign_shortlist',
    'vendors',
    'events',
    'event_vendors',
    'event_influencers',
    'event_sponsors',
    'tasks',
    'invoices',
    'vendor_payments',
    'expenses',
    'notifications',
    'documents',
    'comments',
    'task_comments',
    'activities',
    'vigor_zones',
    'vigor_states',
    'vigor_cities',
    'vigor_colleges',
    'vigor_college_pocs'
  ];
  t text;
  already_member boolean;
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    -- Check if this table exists in the public schema
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE NOTICE 'Table "%" does not exist — skipping.', t;
      CONTINUE;
    END IF;

    -- Check if this table is already a member of supabase_realtime
    SELECT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) INTO already_member;

    IF already_member THEN
      RAISE NOTICE 'Table "%" is already in supabase_realtime — skipping.', t;
    ELSE
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Table "%" added to supabase_realtime.', t;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- Verify — see which tables are now in the publication
-- ============================================================================
SELECT tablename, schemaname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- STEP 2 — Set Frontend Environment Variables (Vercel)
-- ============================================================================
-- In your Vercel dashboard → frontend project → Settings → Environment Variables:
--
--   VITE_SUPABASE_URL      = https://your-project-id.supabase.co
--   VITE_SUPABASE_ANON_KEY = your-supabase-anon-key  (NOT service role key)
--
-- The anon key is safe to expose on the frontend. The service role key must
-- only be used on the backend.
-- ============================================================================

-- ============================================================================
-- STEP 3 — Disable RLS (simplest for private/internal apps)
-- ============================================================================
-- Supabase Realtime only delivers postgres_changes events to the anon key
-- if the anon role can SELECT those rows (via RLS or disabled RLS).
-- For a private internal CRM, disabling RLS is the simplest approach.
-- Run ONLY the tables that exist in your project:
-- ============================================================================

DO $$
DECLARE
  tables_to_configure text[] := ARRAY[
    'leads', 'users', 'clients', 'influencers', 'influencer_lists',
    'campaigns', 'campaign_shortlist', 'vendors', 'events',
    'event_vendors', 'event_influencers', 'event_sponsors', 'tasks',
    'invoices', 'vendor_payments', 'expenses', 'notifications',
    'documents', 'comments', 'task_comments', 'activities',
    'vigor_zones', 'vigor_states', 'vigor_cities',
    'vigor_colleges', 'vigor_college_pocs'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_configure LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS disabled on "%".', t;
    ELSE
      RAISE NOTICE 'Table "%" not found — skipping RLS disable.', t;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- • The backend uses the SERVICE ROLE KEY — bypasses RLS entirely.
--   All backend operations always work regardless of RLS settings.
-- • The frontend uses the ANON KEY — subject to RLS.
--   Realtime events are only delivered if the anon role can SELECT the row.
-- • If Realtime events are still not firing after running this script:
--   1. Supabase Dashboard → Database → Replication → verify tables are listed
--   2. Supabase Dashboard → Project Settings → API → confirm ANON key matches
--      your VITE_SUPABASE_ANON_KEY environment variable
--   3. Check browser console for Supabase Realtime subscription status logs
-- ============================================================================
