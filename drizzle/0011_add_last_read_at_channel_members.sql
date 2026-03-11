-- Phase 6: Add last_read_at to chat_channel_members for unread tracking
ALTER TABLE "chat_channel_members" ADD COLUMN IF NOT EXISTS "last_read_at" timestamp with time zone;
