CREATE TABLE "calendar_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"subscription_id" varchar(500) NOT NULL,
	"resource_id" varchar(500),
	"expires_at" timestamp with time zone NOT NULL,
	"sync_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cal_sub_subscription_id_idx" ON "calendar_subscriptions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "cal_sub_integration_idx" ON "calendar_subscriptions" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "cal_sub_user_org_idx" ON "calendar_subscriptions" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "cal_sub_expires_idx" ON "calendar_subscriptions" USING btree ("expires_at");