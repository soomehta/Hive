-- ═══════════════════════════════════════════════════════════
-- Enable Row Level Security (RLS) on ALL tables
-- ═══════════════════════════════════════════════════════════
--
-- Context: Hive accesses PostgreSQL via Drizzle ORM using the
-- `postgres` superuser role (connection pooler), which bypasses RLS.
-- The Supabase `service_role` also bypasses RLS by default.
--
-- RLS is enabled with DENY-ALL policies for `anon` and
-- `authenticated` roles, which blocks direct PostgREST access.
-- All legitimate data access goes through server-side API routes
-- using Drizzle ORM (postgres role).
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
      'agent_schedules',
      'agent_reports',
      'agent_checkins',
      'checkin_preferences',
      -- Dashboard
      'dashboard_layouts',
      'component_registry',
      -- Collaboration (Phase 6+)
      'items',
      'item_relations',
      'pages',
      'page_revisions',
      'pinboard_layouts_user',
      'notices',
      'chat_channels',
      'chat_channel_members',
      'chat_messages',
      'chat_threads',
      'chat_thread_messages',
      'mentions',
      'message_reactions',
      -- Workspaces
      'workspaces',
      'workspace_members',
      -- Guests
      'project_guests'
    ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

    -- Force RLS even for table owners (defense in depth)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    -- Remove any previous blanket-allow policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access" ON %I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service_role access" ON %I;', tbl);

    -- Deny-all for authenticated role: blocks direct PostgREST access
    EXECUTE format(
      'CREATE POLICY "Deny authenticated direct access" ON %I
         FOR ALL
         TO authenticated
         USING (false)
         WITH CHECK (false);',
      tbl
    );

    -- Deny-all for anon role: blocks unauthenticated PostgREST access
    EXECUTE format(
      'CREATE POLICY "Deny anon direct access" ON %I
         FOR ALL
         TO anon
         USING (false)
         WITH CHECK (false);',
      tbl
    );

    RAISE NOTICE 'RLS enabled (deny-all) on: %', tbl;
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
