-- Phase 7E: Smart Check-ins

DO $$ BEGIN
  CREATE TYPE "checkin_status" AS ENUM ('pending', 'answered', 'expired', 'escalated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "checkin_frequency" AS ENUM ('daily', 'standard', 'minimal', 'off');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "agent_checkins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL,
  "assignee_user_id" varchar(255) NOT NULL,
  "bee_instance_id" uuid NOT NULL REFERENCES "bee_instances"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "question_context" jsonb,
  "response" text,
  "response_metadata" jsonb,
  "channel_id" uuid,
  "message_id" uuid,
  "status" "checkin_status" NOT NULL DEFAULT 'pending',
  "scheduled_at" timestamp with time zone NOT NULL,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_checkins_org_ws_idx" ON "agent_checkins" ("org_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "agent_checkins_task_idx" ON "agent_checkins" ("task_id");
CREATE INDEX IF NOT EXISTS "agent_checkins_user_status_idx" ON "agent_checkins" ("assignee_user_id", "status");
CREATE INDEX IF NOT EXISTS "agent_checkins_scheduled_idx" ON "agent_checkins" ("scheduled_at");

CREATE TABLE IF NOT EXISTS "checkin_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "frequency" "checkin_frequency" NOT NULL DEFAULT 'standard',
  "preferred_time" varchar(5) DEFAULT '10:00',
  "quiet_hours_start" varchar(5) DEFAULT '18:00',
  "quiet_hours_end" varchar(5) DEFAULT '08:00',
  "max_checkins_per_day" integer NOT NULL DEFAULT 5,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkin_prefs_user_org_idx" ON "checkin_preferences" ("user_id", "org_id");

DROP TRIGGER IF EXISTS update_checkin_preferences_updated_at ON checkin_preferences;
CREATE TRIGGER update_checkin_preferences_updated_at
    BEFORE UPDATE ON checkin_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
