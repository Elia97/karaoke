CREATE TYPE "public"."lyrics_source" AS ENUM('lrclib', 'manual');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('HOST', 'PARTICIPANT');--> statement-breakpoint
CREATE TYPE "public"."pending_action_type" AS ENUM('END_SESSION_ON_HOST_TIMEOUT');--> statement-breakpoint
CREATE TYPE "public"."queue_item_source" AS ENUM('catalog', 'free_text');--> statement-breakpoint
CREATE TYPE "public"."queue_item_status" AS ENUM('QUEUED', 'PREPARING', 'PERFORMING', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('WAITING', 'ACTIVE', 'PAUSED', 'ENDED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_track" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"filename" text NOT NULL,
	"duration_seconds" integer,
	"search_vector" "tsvector" NOT NULL,
	"lyrics_source" "lyrics_source",
	"lyrics_lrc" text,
	"lyrics_plain" text,
	"lyrics_fetched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "karaoke_session" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "session_status" DEFAULT 'WAITING' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "karaoke_session_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participant" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"nickname" text NOT NULL,
	"role" "participant_role" NOT NULL,
	"participant_token" text,
	"is_connected" boolean DEFAULT true NOT NULL,
	"socket_id" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_action" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "pending_action_type" NOT NULL,
	"session_id" text NOT NULL,
	"execute_at" timestamp NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_item" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"singer_id" text NOT NULL,
	"singer_nickname" text NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"track_id" text,
	"filename" text,
	"source" "queue_item_source" NOT NULL,
	"status" "queue_item_status" DEFAULT 'QUEUED' NOT NULL,
	"position" integer,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"actual_started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screen_pairing" (
	"id" text PRIMARY KEY NOT NULL,
	"screen_token" text NOT NULL,
	"pairing_code" text NOT NULL,
	"session_id" text,
	"host_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"paired_at" timestamp,
	CONSTRAINT "screen_pairing_screen_token_unique" UNIQUE("screen_token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catalog_track" ADD CONSTRAINT "catalog_track_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "karaoke_session" ADD CONSTRAINT "karaoke_session_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participant" ADD CONSTRAINT "participant_session_id_karaoke_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."karaoke_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_action" ADD CONSTRAINT "pending_action_session_id_karaoke_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."karaoke_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_session_id_karaoke_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."karaoke_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_singer_id_participant_id_fk" FOREIGN KEY ("singer_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_track_id_catalog_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."catalog_track"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screen_pairing" ADD CONSTRAINT "screen_pairing_session_id_karaoke_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."karaoke_session"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "screen_pairing" ADD CONSTRAINT "screen_pairing_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_track_search_idx" ON "catalog_track" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_track_owner_idx" ON "catalog_track" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_action_execute_idx" ON "pending_action" USING btree ("execute_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_action_session_idx" ON "pending_action" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_item_session_idx" ON "queue_item" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_item_session_status_idx" ON "queue_item" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "screen_pairing_code_idx" ON "screen_pairing" USING btree ("pairing_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "screen_pairing_session_idx" ON "screen_pairing" USING btree ("session_id");