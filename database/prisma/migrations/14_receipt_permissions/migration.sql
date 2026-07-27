INSERT INTO "permissions" ("key", "description")
VALUES ('receipts.manage', 'Confirmar e estornar recebimentos')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key = 'receipts.manage'
WHERE r.tenant_id IS NULL AND r.name IN ('ADMIN', 'MANAGER', 'FRONT_DESK', 'FINANCE')
ON CONFLICT ("role_id", "permission_id") DO UPDATE SET "deleted_at" = NULL;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key = 'service_orders.view'
WHERE r.tenant_id IS NULL AND r.name = 'FINANCE'
ON CONFLICT ("role_id", "permission_id") DO UPDATE SET "deleted_at" = NULL;
