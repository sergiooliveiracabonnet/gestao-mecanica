-- Agenda própria da oficina. Sem FKs físicas; integridade é validada no Manager.
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "technician_id" UUID,
    "service_order_id" UUID,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "service_description" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_by" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_valid_interval" CHECK ("ends_at" > "starts_at")
);

CREATE INDEX "appointments_tenant_period_idx" ON "appointments"("tenant_id", "starts_at", "ends_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "appointments_tenant_technician_period_idx" ON "appointments"("tenant_id", "technician_id", "starts_at", "ends_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "appointments_vehicle_id_idx" ON "appointments"("vehicle_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "appointments_service_order_id_key" ON "appointments"("service_order_id") WHERE "service_order_id" IS NOT NULL AND "deleted_at" IS NULL;
