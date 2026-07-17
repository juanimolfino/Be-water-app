CREATE TYPE "public"."payment_status" AS ENUM('paid', 'unpaid');--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "payment_status" "payment_status" DEFAULT 'paid' NOT NULL;