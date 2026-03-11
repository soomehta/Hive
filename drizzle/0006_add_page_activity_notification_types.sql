ALTER TYPE "public"."activity_type" ADD VALUE 'page_created';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'page_created' BEFORE 'bee_swarm_completed';