ALTER TYPE "public"."activity_type" ADD VALUE 'page_updated';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'page_restored';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'notice_created';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'notice_updated';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'notice_pinned';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'notice_archived';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'channel_created';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'channel_updated';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'channel_message_posted';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'channel_message_edited';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'channel_message_deleted';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'member_added_to_channel';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'member_removed_from_channel';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'item_linked';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'item_unlinked';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'message_converted_to_task';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'message_converted_to_page';