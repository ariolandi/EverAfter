CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_child" boolean DEFAULT false NOT NULL,
	"salad" text NOT NULL,
	"appetizer" text NOT NULL,
	"main_course" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "is_child" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menus_event_id" ON "menus" USING btree ("event_id");