CREATE TABLE "event_coowners" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_coowners_event_email" UNIQUE("event_id","email")
);
--> statement-breakpoint
ALTER TABLE "event_coowners" ADD CONSTRAINT "event_coowners_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_coowners_email" ON "event_coowners" USING btree ("email");