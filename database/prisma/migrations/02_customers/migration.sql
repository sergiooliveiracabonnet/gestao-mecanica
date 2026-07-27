-- Feature 3 (Clientes): customers. Sem FK física nem CASCADE — integridade
-- validada na camada de aplicação (Manager). Ver spec:
-- .planning/specs/clientes-crud-pf-pj.md

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular)
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex (partial unique, composto — documento é único POR TENANT,
-- não globalmente, ao contrário de tenants.document; ver comentário no
-- schema.prisma. Parcial para não travar reuso do documento depois de um
-- soft delete, ver SCHEMA.md "Index Strategy for Soft Deletes")
CREATE UNIQUE INDEX "idx_customers_tenant_document_active" ON "customers"("tenant_id", "document") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial, para queries de limpeza/retenção — companion do
-- índice único parcial acima)
CREATE INDEX "idx_customers_deleted" ON "customers"("deleted_at") WHERE "deleted_at" IS NOT NULL;
