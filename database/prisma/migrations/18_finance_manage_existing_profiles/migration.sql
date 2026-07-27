INSERT INTO role_permissions (role_id, permission_id)
SELECT existing.role_id, manage.id
FROM role_permissions existing
JOIN permissions view_permission ON view_permission.id = existing.permission_id
JOIN permissions manage ON manage.key = 'finance.manage'
WHERE view_permission.key = 'finance.view'
  AND existing.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO UPDATE SET deleted_at = NULL;
