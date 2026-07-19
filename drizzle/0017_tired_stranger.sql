CREATE TYPE "public"."activity_category" AS ENUM('buceo', 'snorkel', 'pasajero', 'catamaran', 'atv', 'tirolesa', 'otro');--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "category" "activity_category" DEFAULT 'otro' NOT NULL;--> statement-breakpoint
-- Backfill de categoría para actividades propias existentes, en base al
-- mismo criterio por nombre que usaba la agenda antes de este campo.
UPDATE "activities" SET "category" = 'snorkel' WHERE "is_own_activity" = true AND "tour_name" ILIKE '%snorkel%';--> statement-breakpoint
UPDATE "activities" SET "category" = 'buceo' WHERE "is_own_activity" = true AND "tour_name" NOT ILIKE '%snorkel%';