ALTER TABLE "guests" ADD COLUMN "token" text;--> statement-breakpoint
UPDATE "guests" SET "token" = md5(random()::text || "id"::text || clock_timestamp()::text);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_token_unique" UNIQUE("token");--> statement-breakpoint
DELETE FROM "form_responses" a USING "form_responses" b WHERE a."guest_id" = b."guest_id" AND a."form_id" = b."form_id" AND a."id" < b."id";--> statement-breakpoint
CREATE UNIQUE INDEX "form_responses_form_guest" ON "form_responses" USING btree ("form_id","guest_id") WHERE "form_responses"."guest_id" is not null;
