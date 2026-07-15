CREATE TYPE "public"."commission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('CRC', 'USD');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'tour_operator');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('superadmin', 'admin', 'seller');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"provider_name" text NOT NULL,
	"is_own_activity" boolean DEFAULT true NOT NULL,
	"tour_name" text NOT NULL,
	"rack_price" numeric(10, 2),
	"net_price" numeric(10, 2),
	"commission_amount" numeric(10, 2),
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"phone" text,
	"office_location" text,
	"meeting_point" text,
	"distance_to_activity" text,
	"meeting_time" text,
	"duration" text,
	"tour_location" text,
	"includes" text,
	"excludes" text,
	"what_to_bring" text,
	"what_you_will_see" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dive_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"phone" text,
	"email" text,
	"office_location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dive_centers_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"commission_status" "commission_status" DEFAULT 'pending' NOT NULL,
	"sale_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"validated_by_user_id" uuid,
	"validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dive_center_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE set null ON UPDATE no action;