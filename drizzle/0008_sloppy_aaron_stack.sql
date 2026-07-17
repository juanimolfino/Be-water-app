CREATE TYPE "public"."reservation_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "reservation_status" "reservation_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;