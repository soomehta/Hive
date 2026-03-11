-- Phase 6: Add is_pinned column to chat_messages for pinned message support
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "is_pinned" boolean NOT NULL DEFAULT false;
