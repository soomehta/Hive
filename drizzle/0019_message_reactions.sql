CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "message_id" uuid NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "user_id" varchar(255) NOT NULL,
  "emoji" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "message_reactions_unique" UNIQUE("message_id", "user_id", "emoji")
);

CREATE INDEX IF NOT EXISTS "message_reactions_message_idx" ON "message_reactions" ("message_id");
