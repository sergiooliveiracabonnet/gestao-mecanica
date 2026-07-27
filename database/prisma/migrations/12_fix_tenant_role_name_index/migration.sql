-- A migração 11 removeu a constraint, mas instalações antigas podem manter
-- o índice único criado pelo Prisma. Ele impediria perfis com o mesmo nome
-- em oficinas diferentes e também a personalização dos perfis padrão.
DROP INDEX IF EXISTS "roles_name_key";
