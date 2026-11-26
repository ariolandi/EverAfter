ALTER TABLE "forms" ADD COLUMN "organizers" jsonb;--> statement-breakpoint
UPDATE "forms" SET "organizers" = jsonb_build_array("bride_name", "groom_name");--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "organizers" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" DROP COLUMN "bride_name";--> statement-breakpoint
ALTER TABLE "forms" DROP COLUMN "groom_name";
