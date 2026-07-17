-- Feature 5 (Ordem de Serviço): service_orders + service_order_status_history.
-- Sem FK física nem CASCADE — integridade validada na camada de aplicação
-- (ServiceOrderManager). vehicle_id/technician_id validados no Manager,
-- nunca uma constraint física. Ver spec: .planning/specs/ordem-de-servico.md

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "checklist" JSONB,
    "diagnosis" TEXT,
    "technician_id" UUID,
    "opened_at" TIMESTAMPTZ NOT NULL,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular)
CREATE INDEX "service_orders_tenant_id_idx" ON "service_orders"("tenant_id");
CREATE INDEX "service_orders_customer_id_idx" ON "service_orders"("customer_id");
CREATE INDEX "service_orders_vehicle_id_idx" ON "service_orders"("vehicle_id");
CREATE INDEX "service_orders_status_idx" ON "service_orders"("status");
CREATE INDEX "service_orders_technician_id_idx" ON "service_orders"("technician_id");

-- CreateIndex (partial, para queries de limpeza/retenção)
CREATE INDEX "idx_service_orders_deleted" ON "service_orders"("deleted_at") WHERE "deleted_at" IS NOT NULL;

-- CreateTable
-- Sem tenant_id de propósito — ver comentário no schema.prisma sobre
-- ServiceOrderStatusHistory: só é lida/escrita por service_order_id, que já
-- passou por um lookup tenant-scoped em service_orders antes de chegar aqui.
CREATE TABLE "service_order_status_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service_order_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular)
CREATE INDEX "service_order_status_history_service_order_id_idx" ON "service_order_status_history"("service_order_id");
