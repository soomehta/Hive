CREATE TABLE "pa_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"org_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pa_conversations" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_chat_sessions" ADD CONSTRAINT "pa_chat_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pa_chat_sessions_user_org_idx" ON "pa_chat_sessions" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "pa_chat_sessions_last_msg_idx" ON "pa_chat_sessions" USING btree ("last_message_at");--> statement-breakpoint
ALTER TABLE "pa_conversations" ADD CONSTRAINT "pa_conversations_session_id_pa_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."pa_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_org_user_created_idx" ON "activity_log" USING btree ("org_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_org_idx" ON "messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "notifications_user_org_idx" ON "notifications" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "pa_actions_user_org_idx" ON "pa_actions" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "pa_conversations_session_idx" ON "pa_conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "tasks_completed_at_idx" ON "tasks" USING btree ("completed_at");