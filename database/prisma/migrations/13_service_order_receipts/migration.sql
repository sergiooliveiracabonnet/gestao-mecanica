ALTER TABLE "service_orders" ADD COLUMN "payment_method" TEXT;

CREATE TABLE "service_order_receipts" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenant_id" UUID NOT NULL,
  "service_order_id" UUID NOT NULL,
  "method" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "received_at" TIMESTAMPTZ NOT NULL,
  "confirmed_by" UUID NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "service_order_receipts_amount_positive" CHECK ("amount_cents" > 0)
);

CREATE INDEX "service_order_receipts_tenant_id_idx"
  ON "service_order_receipts" ("tenant_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "service_order_receipts_service_order_id_idx"
  ON "service_order_receipts" ("service_order_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "service_order_receipts_received_at_idx"
  ON "service_order_receipts" ("tenant_id", "received_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "service_order_receipts_deleted_at_idx"
  ON "service_order_receipts" ("deleted_at") WHERE "deleted_at" IS NOT NULL;
