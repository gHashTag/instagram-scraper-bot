CREATE TABLE "parsing_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"project_id" integer,
	"source_type" varchar(50),
	"source_id" integer,
	"status" varchar(50) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"reels_found_count" integer DEFAULT 0 NOT NULL,
	"reels_added_count" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"log_message" text,
	"error_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parsing_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "test_table" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "reels" ALTER COLUMN "reel_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reels" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "parsing_runs" ADD CONSTRAINT "parsing_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;