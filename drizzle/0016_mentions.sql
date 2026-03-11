-- Phase 7C: Mentions System

DO $$ BEGIN
  CREATE TYPE "mention_type" AS ENUM ('user', 'agent', 'item');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "mention_source_type" AS ENUM ('chat_message', 'thread_message', 'task_comment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "mentions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "source_type" "mention_source_type" NOT NULL,
  "source_id" uuid NOT NULL,
  "mention_type" "mention_type" NOT NULL,
  "target_id" varchar(255) NOT NULL,
  "display_text" varchar(500) NOT NULL,
  "start_offset" integer,
  "end_offset" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mentions_org_source_idx" ON "mentions" ("org_id", "source_type", "source_id");
CREATE INDEX IF NOT EXISTS "mentions_target_idx" ON "mentions" ("target_id");
