CREATE TYPE "public"."calendar_event_sync_status" AS ENUM('local', 'synced', 'syncing', 'error');--> statement-breakpoint
CREATE TYPE "public"."google_connection_status" AS ENUM('connected', 'error', 'revoked');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"google_connection_id" uuid,
	"google_event_id" text,
	"google_etag" text,
	"google_recurring_event_id" text,
	"sync_status" "calendar_event_sync_status" DEFAULT 'local' NOT NULL,
	"sync_error" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_connection_google_event_unique" UNIQUE("google_connection_id","google_event_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_account_email" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"google_calendar_id" text DEFAULT 'primary' NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone,
	"status" "google_connection_status" DEFAULT 'connected' NOT NULL,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendar_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_google_connection_id_google_calendar_connections_id_fk" FOREIGN KEY ("google_connection_id") REFERENCES "public"."google_calendar_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_range_idx" ON "calendar_events" USING btree ("workspace_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "calendar_events_google_connection_idx" ON "calendar_events" USING btree ("google_connection_id");