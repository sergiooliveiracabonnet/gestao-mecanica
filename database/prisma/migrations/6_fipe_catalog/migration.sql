-- Integração FIPE: fipe_brands + fipe_models. Catálogo global, sem
-- tenant_id (não é dado de tenant) e sem deleted_at (sincronização é
-- sempre upsert, nunca remove). Ver spec: .planning/specs/veiculos-integracao-fipe.md

-- CreateTable
CREATE TABLE "fipe_brands" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category" TEXT NOT NULL,
    "fipe_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "synced_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "fipe_brands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique, chave de upsert)
CREATE UNIQUE INDEX "idx_fipe_brands_category_fipe_code" ON "fipe_brands"("category", "fipe_code");

-- CreateTable
CREATE TABLE "fipe_models" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "brand_id" UUID NOT NULL,
    "fipe_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "synced_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "fipe_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique, chave de upsert)
CREATE UNIQUE INDEX "idx_fipe_models_brand_id_fipe_code" ON "fipe_models"("brand_id", "fipe_code");

-- CreateIndex (regular, pra listByBrandId)
CREATE INDEX "fipe_models_brand_id_idx" ON "fipe_models"("brand_id");
