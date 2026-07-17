CREATE TYPE "public"."expense_payment_method" AS ENUM('cash', 'bank_transfer');--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"payment_method" "expense_payment_method" NOT NULL,
	"expense_date" date NOT NULL,
	"description" text NOT NULL,
	"provider_name" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_center_name_idx" ON "expense_categories" USING btree ("dive_center_id","name");