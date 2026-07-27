-- Motor de Manutenção Preventiva: maintenance_alerts. Tenant-scoped (ao
-- contrário de fipe_brands/fipe_models). Sem deleted_at — alertas nunca são
-- apagados, só resolvidos (coluna status). Ver spec:
-- .planning/specs/motor-manutencao-preventiva.md

-- CreateTable
CREATE TABLE "maintenance_alerts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reference_date" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "maintenance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique, chave de idempotência do job)
CREATE UNIQUE INDEX "idx_maintenance_alerts_vehicle_id_reference_date" ON "maintenance_alerts"("vehicle_id", "reference_date");

-- CreateIndex (regular, pra listByTenant filtrado por status)
CREATE INDEX "idx_maintenance_alerts_tenant_id_status" ON "maintenance_alerts"("tenant_id", "status");
