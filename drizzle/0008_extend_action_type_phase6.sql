-- Phase 6: Add action types for Pinboard, Canvas Pages, and Team Chat
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'create_page';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'update_page';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'summarize_page';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'link_items';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'unlink_items';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'create_notice';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'create_channel';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'post_channel_message';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'convert_message_to_task';
ALTER TYPE "action_type" ADD VALUE IF NOT EXISTS 'convert_message_to_page';
