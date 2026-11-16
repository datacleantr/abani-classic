CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" varchar(40) NOT NULL,
	"source_listing_id" varchar(120) NOT NULL,
	"source_url" text,
	"title" varchar(300),
	"brand_name" varchar(160),
	"parser_version" varchar(40) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "access_token" varchar(64) DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" varchar(40) DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reservation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "attributes" jsonb;--> statement-breakpoint
CREATE INDEX "login_attempts_bucket_idx" ON "login_attempts" USING btree ("bucket","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_products_uq" ON "source_products" USING btree ("source_key","source_listing_id");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_on_hand_nonneg" CHECK ("inventory"."on_hand" >= 0);--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_reserved_nonneg" CHECK ("inventory"."reserved" >= 0);--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_reserved_lte_on_hand" CHECK ("inventory"."reserved" <= "inventory"."on_hand");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);