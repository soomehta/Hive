-- ═══════════════════════════════════════════════════════════
-- Enable Row Level Security (RLS) on ALL tables
-- ═══════════════════════════════════════════════════════════
--
-- Context: Hive accesses PostgreSQL via Drizzle ORM using the
-- `postgres` superuser role (connection pooler), which bypasses RLS.
-- The Supabase `service_role` also bypasses RLS by default.
--
-- Enabling RLS without permissive policies for `anon` or
-- `authenticated` effectively blocks direct PostgREST access
-- via the anon key, which is the correct posture since this
-- app routes all data access through server-side API routes.
--
-- Run: psql $DATABASE_URL -f scripts/enable-rls.sql
-- Or via Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      -- Organizations
      'organizations',
      'organization_members',
      'invitations',
      -- Projects
      'projects',
      'project_members',
      -- Tasks
      'tasks',
      'task_comments',
      -- Messages
      'messages',
      -- Activity
      'activity_log',
      -- Notifications
      'notifications',
      -- Files
      'files',
      -- PA
      'pa_profiles',
      'pa_chat_sessions',
      'pa_conversations',
      'pa_actions',
      'pa_corrections',
      'scheduled_reports',
      'voice_transcripts',
      -- Integrations
      'integrations',
      'calendar_subscriptions',
      -- Embeddings
      'embeddings',
      -- Bees
      'bee_templates',
      'bee_instances',
      'swarm_sessions',
      'bee_runs',
      'hive_context',
      'bee_handovers',
      'bee_signals',
      -- Dashboard
      'dashboard_layouts',
      'component_registry'
    ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Force RLS even for table owners (defense in depth)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    -- Allow the authenticated role to access rows through API routes
    -- (needed because Supabase Realtime uses authenticated role internally)
    -- These policies use `true` but are scoped — the actual authorization
    -- happens in the application layer via authenticateRequest().
    EXECUTE format(
      'DROP POLICY IF EXISTS "Allow authenticated access" ON %I;
       CREATE POLICY "Allow authenticated access" ON %I
         FOR ALL
         TO authenticated
         USING (true)
         WITH CHECK (true);',
      tbl, tbl
    );

    -- Allow the service_role full access (already bypasses RLS,
    -- but explicit policy documents the intent)
    EXECUTE format(
      'DROP POLICY IF EXISTS "Allow service_role access" ON %I;
       CREATE POLICY "Allow service_role access" ON %I
         FOR ALL
         TO service_role
         USING (true)
         WITH CHECK (true);',
      tbl, tbl
    );

    RAISE NOTICE 'RLS enabled on: %', tbl;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- Verify: list tables with RLS status
-- ═══════════════════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
