CREATE TYPE "public"."provider_payment_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TABLE "agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"item_date" date NOT NULL,
	"title" text NOT NULL,
	"quantity" integer,
	"responsible_user_id" uuid,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agenda_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"notice_date" date NOT NULL,
	"message" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "provider_payment_status" "provider_payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "provider_payment_method" "expense_payment_method";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "provider_paid_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "provider_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_notices" ADD CONSTRAINT "agenda_notices_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_notices" ADD CONSTRAINT "agenda_notices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_provider_paid_by_user_id_users_id_fk" FOREIGN KEY ("provider_paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;