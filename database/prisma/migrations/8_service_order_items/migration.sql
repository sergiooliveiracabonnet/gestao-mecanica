-- Feature 8 (Itens e Preço da OS, epic modulo-financeiro-relatorios):
-- service_order_items. Sem FK física, sem tenant_id de propósito — mesmo
-- padrão de service_order_status_history: só é lida/escrita por
-- service_order_id, já tenant-scoped antes de chegar aqui. `quantity` é
-- NUMERIC pra aceitar fracionário; `unit_price_cents` em centavos, nunca
-- ponto flutuante. Ver spec: .planning/specs/itens-e-preco-da-os.md

-- CreateTable
CREATE TABLE "service_order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "service_order_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "service_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular)
CREATE INDEX "service_order_items_service_order_id_idx" ON "service_order_items"("service_order_id");
