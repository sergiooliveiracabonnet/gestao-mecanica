-- Feature 6 (Cadastro de Cliente Expandido): 7 colunas novas em
-- `customers`, todas nullable, sem default. Sem migração de dados
-- existentes necessária. Ver spec: .planning/specs/cadastro-cliente-expandido.md

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "state_registration" TEXT,
  ADD COLUMN "secondary_contact_name" TEXT,
  ADD COLUMN "secondary_contact_phone" TEXT,
  ADD COLUMN "secondary_contact_relation" TEXT,
  ADD COLUMN "preferred_contact_channel" TEXT,
  ADD COLUMN "preferred_contact_time" TEXT;
