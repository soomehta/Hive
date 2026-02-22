CREATE TYPE "public"."bee_run_status" AS ENUM('queued', 'running', 'waiting_handover', 'waiting_signal', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bee_subtype" AS ENUM('none', 'orchestrator', 'coordinator', 'specialist', 'analyst', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."bee_type" AS ENUM('assistant', 'admin', 'manager', 'operator');--> statement-breakpoint
CREATE TYPE "public"."dashboard_component_type" AS ENUM('board', 'list', 'timeline', 'calendar', 'activity_feed', 'metrics_panel', 'team_view', 'files', 'chat_messages', 'bee_panel', 'custom_widget');--> statement-breakpoint
CREATE TYPE "public"."handover_type" AS ENUM('sequential', 'parallel', 'conditional');--> statement-breakpoint
CREATE TYPE "public"."pathway" AS ENUM('boards', 'lists', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('hold', 'info', 'warning', 'escalate');--> statement-breakpoint
CREATE TYPE "public"."swarm_status" AS ENUM('planning', 'running', 'paused', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'bee_swarm_started';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'bee_swarm_completed';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'bee_handover';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'bee_signal';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'dashboard_layout_changed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'bee_swarm_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'bee_signal_hold';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'bee_needs_approval';--> statement-breakpoint
CREATE TABLE "bee_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swarm_session_id" uuid NOT NULL,
	"from_bee_run_id" uuid NOT NULL,
	"to_bee_run_id" uuid NOT NULL,
	"handover_type" "handover_type" NOT NULL,
	"summary" text NOT NULL,
	"data" jsonb,
	"request" text,
	"constraints" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bee_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"name" varchar(255) NOT NULL,
	"context_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bee_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swarm_session_id" uuid NOT NULL,
	"bee_instance_id" uuid NOT NULL,
	"status" "bee_run_status" DEFAULT 'queued' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"status_text" text,
	"tokens_used" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bee_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swarm_session_id" uuid NOT NULL,
	"from_bee_run_id" uuid NOT NULL,
	"target_bee_run_id" uuid,
	"signal_type" "signal_type" NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bee_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "bee_type" NOT NULL,
	"subtype" "bee_subtype" DEFAULT 'none' NOT NULL,
	"system_prompt" text NOT NULL,
	"tool_access" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_autonomy_tier" "action_tier" DEFAULT 'draft_approve' NOT NULL,
	"trigger_conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "dashboard_component_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"default_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"supported_pathways" jsonb NOT NULL,
	"min_width" integer DEFAULT 1 NOT NULL,
	"max_width" integer DEFAULT 4 NOT NULL,
	"min_height" integer DEFAULT 1 NOT NULL,
	"max_height" integer DEFAULT 4 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "component_registry_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid,
	"user_id" varchar(255),
	"pathway" "pathway" NOT NULL,
	"layout_preset_index" integer DEFAULT 0 NOT NULL,
	"slots" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hive_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swarm_session_id" uuid NOT NULL,
	"bee_run_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"context_type" varchar(50) NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"conversation_id" uuid,
	"trigger_message" text NOT NULL,
	"dispatch_plan" jsonb NOT NULL,
	"status" "swarm_status" DEFAULT 'planning' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "pathway" "pathway" DEFAULT 'boards' NOT NULL;--> statement-breakpoint
ALTER TABLE "pa_actions" ADD COLUMN "bee_run_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_actions" ADD COLUMN "swarm_session_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_conversations" ADD COLUMN "bee_instance_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_conversations" ADD COLUMN "swarm_session_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_profiles" ADD COLUMN "assistant_bee_instance_id" uuid;--> statement-breakpoint
ALTER TABLE "pa_profiles" ADD COLUMN "swarm_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pa_profiles" ADD COLUMN "bee_autonomy_overrides" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bee_handovers" ADD CONSTRAINT "bee_handovers_swarm_session_id_swarm_sessions_id_fk" FOREIGN KEY ("swarm_session_id") REFERENCES "public"."swarm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_handovers" ADD CONSTRAINT "bee_handovers_from_bee_run_id_bee_runs_id_fk" FOREIGN KEY ("from_bee_run_id") REFERENCES "public"."bee_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_handovers" ADD CONSTRAINT "bee_handovers_to_bee_run_id_bee_runs_id_fk" FOREIGN KEY ("to_bee_run_id") REFERENCES "public"."bee_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_instances" ADD CONSTRAINT "bee_instances_template_id_bee_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bee_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_instances" ADD CONSTRAINT "bee_instances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_instances" ADD CONSTRAINT "bee_instances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_runs" ADD CONSTRAINT "bee_runs_swarm_session_id_swarm_sessions_id_fk" FOREIGN KEY ("swarm_session_id") REFERENCES "public"."swarm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_runs" ADD CONSTRAINT "bee_runs_bee_instance_id_bee_instances_id_fk" FOREIGN KEY ("bee_instance_id") REFERENCES "public"."bee_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_signals" ADD CONSTRAINT "bee_signals_swarm_session_id_swarm_sessions_id_fk" FOREIGN KEY ("swarm_session_id") REFERENCES "public"."swarm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_signals" ADD CONSTRAINT "bee_signals_from_bee_run_id_bee_runs_id_fk" FOREIGN KEY ("from_bee_run_id") REFERENCES "public"."bee_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_signals" ADD CONSTRAINT "bee_signals_target_bee_run_id_bee_runs_id_fk" FOREIGN KEY ("target_bee_run_id") REFERENCES "public"."bee_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bee_templates" ADD CONSTRAINT "bee_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hive_context" ADD CONSTRAINT "hive_context_swarm_session_id_swarm_sessions_id_fk" FOREIGN KEY ("swarm_session_id") REFERENCES "public"."swarm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hive_context" ADD CONSTRAINT "hive_context_bee_run_id_bee_runs_id_fk" FOREIGN KEY ("bee_run_id") REFERENCES "public"."bee_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swarm_sessions" ADD CONSTRAINT "swarm_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bee_handovers_swarm_idx" ON "bee_handovers" USING btree ("swarm_session_id");--> statement-breakpoint
CREATE INDEX "bee_instances_org_idx" ON "bee_instances" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "bee_instances_project_idx" ON "bee_instances" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bee_instances_template_idx" ON "bee_instances" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "bee_runs_swarm_idx" ON "bee_runs" USING btree ("swarm_session_id");--> statement-breakpoint
CREATE INDEX "bee_runs_instance_idx" ON "bee_runs" USING btree ("bee_instance_id");--> statement-breakpoint
CREATE INDEX "bee_runs_status_idx" ON "bee_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bee_signals_swarm_idx" ON "bee_signals" USING btree ("swarm_session_id");--> statement-breakpoint
CREATE INDEX "bee_signals_resolved_idx" ON "bee_signals" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "bee_templates_org_idx" ON "bee_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "bee_templates_type_idx" ON "bee_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_org_idx" ON "dashboard_layouts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_user_idx" ON "dashboard_layouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_project_idx" ON "dashboard_layouts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "hive_context_swarm_idx" ON "hive_context" USING btree ("swarm_session_id");--> statement-breakpoint
CREATE INDEX "hive_context_bee_run_idx" ON "hive_context" USING btree ("bee_run_id");--> statement-breakpoint
CREATE INDEX "hive_context_key_idx" ON "hive_context" USING btree ("key");--> statement-breakpoint
CREATE INDEX "swarm_sessions_org_idx" ON "swarm_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "swarm_sessions_user_idx" ON "swarm_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swarm_sessions_status_idx" ON "swarm_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "voice_transcripts_user_created_idx" ON "voice_transcripts" USING btree ("user_id","created_at");