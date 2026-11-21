CREATE TABLE "guest_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_groups_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN "guest_id" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "guest_groups" ADD CONSTRAINT "guest_groups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_groups_event_id" ON "guest_groups" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_group_id_guest_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."guest_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_group_id_guest_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."guest_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_responses_group_id" ON "form_responses" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "guests_group_id" ON "guests" USING btree ("group_id");