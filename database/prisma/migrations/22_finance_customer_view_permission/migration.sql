INSERT INTO role_permissions (role_id, permission_id)
SELECT finance.role_id, customer_view.id
FROM role_permissions finance
JOIN permissions finance_view ON finance_view.id = finance.permission_id AND finance_view.key = 'finance.view'
JOIN permissions customer_view ON customer_view.key = 'customers.view'
WHERE finance.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO UPDATE SET deleted_at = NULL;
