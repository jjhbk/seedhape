CREATE TYPE "public"."dispute_resolution" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('live', 'test');--> statement-breakpoint
CREATE TYPE "public"."merchant_status" AS ENUM('ONLINE', 'OFFLINE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'STARTER', 'GROWTH', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('CREATED', 'PENDING', 'VERIFIED', 'DISPUTED', 'RESOLVED', 'EXPIRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('UPI_NOTIFICATION', 'SCREENSHOT_OCR', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"environment" "environment" NOT NULL,
	"name" varchar(100) DEFAULT 'Default',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"fcm_token" varchar(512),
	"app_version" varchar(50),
	"device_model" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"screenshot_url" text,
	"ocr_result" jsonb,
	"resolution" "dispute_resolution" DEFAULT 'PENDING' NOT NULL,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"business_name" varchar(255) DEFAULT '' NOT NULL,
	"upi_id" varchar(100),
	"webhook_url" text,
	"webhook_secret" varchar(255),
	"status" "merchant_status" DEFAULT 'OFFLINE' NOT NULL,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"monthly_tx_count" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"external_order_id" varchar(100),
	"amount" integer NOT NULL,
	"original_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"description" text,
	"customer_email" varchar(255),
	"customer_phone" varchar(20),
	"status" "order_status" DEFAULT 'CREATED' NOT NULL,
	"upi_uri" text NOT NULL,
	"verification_method" "verification_method",
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"merchant_id" uuid NOT NULL,
	"utr" varchar(50),
	"amount" integer NOT NULL,
	"sender_name" varchar(255),
	"upi_app" varchar(100),
	"raw_notification" jsonb,
	"matched_via" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" "webhook_status" DEFAULT 'PENDING' NOT NULL,
	"next_retry_at" timestamp with time zone,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_merchant_idx" ON "api_keys" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_device_merchant_idx" ON "device_tokens" USING btree ("device_id","merchant_id");--> statement-breakpoint
CREATE INDEX "device_tokens_merchant_idx" ON "device_tokens" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "disputes_order_idx" ON "disputes" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_clerk_user_id_idx" ON "merchants" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_email_idx" ON "merchants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "orders_merchant_status_expires_idx" ON "orders" USING btree ("merchant_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "orders_merchant_amount_status_idx" ON "orders" USING btree ("merchant_id","amount","status");--> statement-breakpoint
CREATE INDEX "orders_merchant_external_idx" ON "orders" USING btree ("merchant_id","external_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_utr_merchant_idx" ON "transactions" USING btree ("utr","merchant_id");--> statement-breakpoint
CREATE INDEX "transactions_order_idx" ON "transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "transactions_merchant_idx" ON "transactions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_order_idx" ON "webhook_deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_retry_idx" ON "webhook_deliveries" USING btree ("status","next_retry_at");