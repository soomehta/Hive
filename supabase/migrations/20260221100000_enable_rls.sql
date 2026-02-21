-- Enable RLS on all tables as defense-in-depth.
-- The app uses the service_role key (bypasses RLS), so these policies
-- only protect against accidental anon-key exposure or direct DB access.

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_member_select" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Organization Members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_org_member" ON invitations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_org_member" ON projects
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Project Members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_members_org_member" ON project_members
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text
      )
    )
  );

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_org_member" ON tasks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Task Comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_comments_org_member" ON task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text
      )
    )
  );

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_org_member" ON messages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Activity Log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_org_member" ON activity_log
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Notifications (user can only see their own)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

-- PA Profiles (user can only see their own)
ALTER TABLE pa_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_profiles_own" ON pa_profiles
  FOR SELECT USING (user_id = auth.uid()::text);

-- PA Conversations
ALTER TABLE pa_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_conversations_own" ON pa_conversations
  FOR SELECT USING (user_id = auth.uid()::text);

-- PA Actions
ALTER TABLE pa_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_actions_own" ON pa_actions
  FOR SELECT USING (user_id = auth.uid()::text);

-- PA Corrections
ALTER TABLE pa_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_corrections_own" ON pa_corrections
  FOR SELECT USING (user_id = auth.uid()::text);

-- Voice Transcripts
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_transcripts_own" ON voice_transcripts
  FOR SELECT USING (user_id = auth.uid()::text);

-- Integrations (user can only see their own)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_own" ON integrations
  FOR SELECT USING (user_id = auth.uid()::text);

-- Embeddings
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "embeddings_org_member" ON embeddings
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()::text)
  );

-- Scheduled Reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_reports_own" ON scheduled_reports
  FOR SELECT USING (user_id = auth.uid()::text);
