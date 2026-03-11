-- Phase 7D: PM Agent (Schedules + Reports)

DO $$ BEGIN
  CREATE TYPE "schedule_type" AS ENUM ('daily_standup', 'weekly_report', 'checkin_sweep');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "agent_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bee_instance_id" uuid NOT NULL REFERENCES "bee_instances"("id") ON DELETE CASCADE,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "schedule_type" "schedule_type" NOT NULL,
  "cron_expression" varchar(100) NOT NULL,
  "timezone" varchar(100) NOT NULL DEFAULT 'UTC',
  "config" jsonb NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  "last_run_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_schedules_bee_idx" ON "agent_schedules" ("bee_instance_id");
CREATE INDEX IF NOT EXISTS "agent_schedules_org_ws_idx" ON "agent_schedules" ("org_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "agent_schedules_active_idx" ON "agent_schedules" ("is_active", "last_run_at");

CREATE TABLE IF NOT EXISTS "agent_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "bee_instance_id" uuid NOT NULL REFERENCES "bee_instances"("id") ON DELETE CASCADE,
  "report_type" varchar(50) NOT NULL,
  "title" varchar(500) NOT NULL,
  "content" text NOT NULL,
  "content_json" jsonb,
  "project_ids" jsonb DEFAULT '[]',
  "period" jsonb,
  "channel_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_reports_org_ws_idx" ON "agent_reports" ("org_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "agent_reports_type_idx" ON "agent_reports" ("report_type");

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_agent_schedules_updated_at ON agent_schedules;
CREATE TRIGGER update_agent_schedules_updated_at
    BEFORE UPDATE ON agent_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
