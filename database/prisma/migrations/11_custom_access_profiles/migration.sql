ALTER TABLE "roles"
  ADD COLUMN "tenant_id" UUID,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "base_role" TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "updated_at" TIMESTAMPTZ,
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_key";
UPDATE "roles" SET "is_system" = TRUE, "base_role" = "name";

CREATE UNIQUE INDEX "roles_system_name_unique"
  ON "roles" ("name") WHERE "tenant_id" IS NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "roles_tenant_name_unique"
  ON "roles" ("tenant_id", "name") WHERE "tenant_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE INDEX "roles_tenant_id_idx" ON "roles" ("tenant_id") WHERE "deleted_at" IS NULL;

ALTER TABLE "role_permissions"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deleted_at" TIMESTAMPTZ;
CREATE INDEX "role_permissions_role_id_idx"
  ON "role_permissions" ("role_id") WHERE "deleted_at" IS NULL;

INSERT INTO "permissions" ("key", "description") VALUES
  ('dashboard.view', 'Visualizar a operação da oficina'),
  ('finance.view', 'Visualizar indicadores e relatórios financeiros'),
  ('service_orders.view', 'Visualizar ordens de serviço'),
  ('service_orders.manage', 'Criar e alterar ordens de serviço'),
  ('service_orders.prices', 'Visualizar e alterar preços da OS'),
  ('appointments.view', 'Visualizar agenda'),
  ('appointments.manage', 'Criar e alterar agendamentos'),
  ('customers.view', 'Visualizar clientes'),
  ('customers.manage', 'Criar e alterar clientes'),
  ('vehicles.view', 'Visualizar veículos'),
  ('vehicles.manage', 'Criar e alterar veículos'),
  ('alerts.view', 'Visualizar alertas'),
  ('alerts.manage', 'Resolver alertas'),
  ('team.view', 'Visualizar equipe'),
  ('team.manage', 'Convidar e alterar usuários'),
  ('profiles.manage', 'Criar perfis e definir permissões')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "roles" ("name", "description", "is_system")
VALUES ('FINANCE', 'Financeiro', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r CROSS JOIN "permissions" p
WHERE r.name = 'ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r JOIN "permissions" p ON p.key = ANY (ARRAY[
  'dashboard.view','service_orders.view','service_orders.manage','service_orders.prices',
  'appointments.view','appointments.manage','customers.view','customers.manage',
  'vehicles.view','vehicles.manage','alerts.view','alerts.manage','team.view','team.manage'
]) WHERE r.name = 'MANAGER'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r JOIN "permissions" p ON p.key = ANY (ARRAY[
  'dashboard.view','service_orders.view','service_orders.manage','appointments.view',
  'customers.view','vehicles.view'
]) WHERE r.name = 'MECHANIC'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r JOIN "permissions" p ON p.key = ANY (ARRAY[
  'dashboard.view','service_orders.view','service_orders.manage','service_orders.prices',
  'appointments.view','appointments.manage','customers.view','customers.manage',
  'vehicles.view','vehicles.manage','alerts.view','alerts.manage'
]) WHERE r.name = 'FRONT_DESK'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r JOIN "permissions" p ON p.key = ANY (ARRAY[
  'dashboard.view','finance.view'
]) WHERE r.name = 'FINANCE'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
