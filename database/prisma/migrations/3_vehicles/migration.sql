-- Feature 4 (Veículos): vehicles. Sem FK física nem CASCADE — integridade
-- validada na camada de aplicação (Manager). customer_id é validado contra
-- customers no VehicleManager, nunca uma constraint física. Ver spec:
-- .planning/specs/veiculos-crud-vinculado-cliente.md

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "engine" TEXT,
    "fuel_type" TEXT,
    "plate" TEXT NOT NULL,
    "chassis" TEXT,
    "mileage" INTEGER,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular)
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles"("customer_id");

-- CreateIndex (partial unique, composto — placa é única POR TENANT, mesmo
-- raciocínio de idx_customers_tenant_document_active; parcial para não
-- travar reuso da placa depois de um soft delete)
CREATE UNIQUE INDEX "idx_vehicles_tenant_plate_active" ON "vehicles"("tenant_id", "plate") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial, para queries de limpeza/retenção)
CREATE INDEX "idx_vehicles_deleted" ON "vehicles"("deleted_at") WHERE "deleted_at" IS NOT NULL;
