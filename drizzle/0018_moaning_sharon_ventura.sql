CREATE TABLE "agenda_capacity_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"flag_date" date NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_capacity_flags" ADD CONSTRAINT "agenda_capacity_flags_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_capacity_flags" ADD CONSTRAINT "agenda_capacity_flags_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_capacity_flags_center_date_idx" ON "agenda_capacity_flags" USING btree ("dive_center_id","flag_date");