ALTER TABLE "forms" ADD COLUMN "primary_color" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "secondary_color" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing invitations: the first colour stays primary and the second, if any, becomes secondary.
UPDATE "forms" SET "secondary_color" = 1 WHERE jsonb_array_length("colors") > 1;
