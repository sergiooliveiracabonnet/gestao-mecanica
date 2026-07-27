ALTER TABLE tenants
  ADD COLUMN legal_name TEXT,
  ADD COLUMN state_registration TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN whatsapp TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN address_street TEXT,
  ADD COLUMN address_number TEXT,
  ADD COLUMN address_complement TEXT,
  ADD COLUMN address_district TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN address_state TEXT,
  ADD COLUMN address_postal_code TEXT,
  ADD COLUMN logo_data_url TEXT,
  ADD COLUMN document_footer TEXT,
  ADD COLUMN smtp_host TEXT,
  ADD COLUMN smtp_port INTEGER NOT NULL DEFAULT 587,
  ADD COLUMN smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN smtp_username TEXT,
  ADD COLUMN smtp_password TEXT,
  ADD COLUMN smtp_from_name TEXT,
  ADD COLUMN smtp_from_email TEXT,
  ADD COLUMN smtp_reply_to TEXT,
  ADD COLUMN smtp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO permissions (key, description)
VALUES
  ('settings.view', 'Visualizar configurações da empresa'),
  ('settings.manage', 'Alterar configurações da empresa e integrações')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM roles role
CROSS JOIN permissions permission
WHERE role.deleted_at IS NULL
  AND role.base_role = 'ADMIN'
  AND permission.key IN ('settings.view', 'settings.manage')
ON CONFLICT (role_id, permission_id) DO UPDATE SET deleted_at = NULL;
