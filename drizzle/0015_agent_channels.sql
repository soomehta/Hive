-- Phase 7B: Agent Communication Channels

-- Add primary_channel_id to pa_profiles
ALTER TABLE "pa_profiles" ADD COLUMN IF NOT EXISTS "primary_channel_id" uuid REFERENCES "chat_channels"("id") ON DELETE SET NULL;

-- Add agent message columns to chat_messages
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "is_agent_message" boolean NOT NULL DEFAULT false;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "agent_bee_instance_id" uuid;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "agent_metadata" jsonb;

-- Add workspace_id to bee_instances
ALTER TABLE "bee_instances" ADD COLUMN IF NOT EXISTS "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE SET NULL;
