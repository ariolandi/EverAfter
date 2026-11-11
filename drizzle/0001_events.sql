CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "event_id" integer;--> statement-breakpoint
-- Forms published before events existed each get an event of their own.
DO $$
DECLARE
	f record;
	new_event_id integer;
BEGIN
	FOR f IN SELECT "id", "user_id", "bride_name", "groom_name", "created_at" FROM "forms" ORDER BY "id" LOOP
		INSERT INTO "events" ("user_id", "name", "created_at")
		VALUES (f."user_id", f."bride_name" || ' & ' || f."groom_name", f."created_at")
		RETURNING "id" INTO new_event_id;
		UPDATE "forms" SET "event_id" = new_event_id WHERE "id" = f."id";
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_user_id" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guests_event_id" ON "guests" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_event_id_unique" UNIQUE("event_id");