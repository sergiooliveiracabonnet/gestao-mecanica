-- Campos operacionais para uma OS profissional e numeração sequencial por oficina.
ALTER TABLE "service_orders"
  ADD COLUMN "order_number" INTEGER,
  ADD COLUMN "entry_mileage" INTEGER,
  ADD COLUMN "customer_complaint" TEXT,
  ADD COLUMN "reception_notes" TEXT,
  ADD COLUMN "recommended_service" TEXT,
  ADD COLUMN "expected_delivery_at" TIMESTAMPTZ;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id)::INTEGER AS number
  FROM service_orders
)
UPDATE service_orders
SET order_number = numbered.number
FROM numbered
WHERE service_orders.id = numbered.id;

ALTER TABLE "service_orders" ALTER COLUMN "order_number" SET NOT NULL;
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_entry_mileage_nonnegative" CHECK ("entry_mileage" IS NULL OR "entry_mileage" >= 0);
CREATE UNIQUE INDEX "service_orders_tenant_id_order_number_key" ON "service_orders"("tenant_id", "order_number");
