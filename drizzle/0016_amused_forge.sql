ALTER TABLE "agenda_items" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "is_we_travel_sale" boolean DEFAULT false NOT NULL;