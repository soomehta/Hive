-- Phase 7A: Workspaces

-- Workspace role enum
DO $$ BEGIN
  CREATE TYPE "workspace_role" AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "description" text,
  "icon_emoji" varchar(50),
  "color" varchar(7),
  "is_default" boolean NOT NULL DEFAULT false,
  "created_by" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workspaces_org_idx" ON "workspaces" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_org_slug_idx" ON "workspaces" ("org_id", "slug");

-- Workspace members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" varchar(255) NOT NULL,
  "role" varchar(50) NOT NULL DEFAULT 'member',
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_ws_user_idx" ON "workspace_members" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "workspace_members_user_idx" ON "workspace_members" ("user_id");

-- Add workspace_id to projects (nullable for backward compatibility)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE SET NULL;

-- Add workspace_id to chat_channels
ALTER TABLE "chat_channels" ADD COLUMN IF NOT EXISTS "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE SET NULL;

-- Extend channel_scope enum with new values
ALTER TYPE "channel_scope" ADD VALUE IF NOT EXISTS 'workspace';
ALTER TYPE "channel_scope" ADD VALUE IF NOT EXISTS 'agent';

-- Extend activity_type enum
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'workspace_created';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'workspace_updated';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'workspace_member_added';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'workspace_member_removed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_checkin_sent';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_checkin_responded';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_report_generated';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'agent_mention_responded';

-- Extend notification_type enum
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'workspace_invite';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'agent_checkin';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'agent_status_update';

-- Extend action_type enum
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'create_workspace';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'update_workspace';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'invite_workspace_member';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'generate_standup';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'generate_weekly_report';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'send_checkin';

-- Updated_at trigger for workspaces
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
