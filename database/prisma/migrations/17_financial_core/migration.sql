CREATE TABLE financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT financial_categories_type_check CHECK (type IN ('INCOME', 'EXPENSE'))
);

CREATE UNIQUE INDEX financial_categories_tenant_name_type_unique
ON financial_categories (tenant_id, LOWER(name), type)
WHERE deleted_at IS NULL;

CREATE INDEX financial_categories_tenant_type_idx
ON financial_categories (tenant_id, type)
WHERE deleted_at IS NULL;

CREATE TABLE financial_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  category_id UUID NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT financial_entries_type_check CHECK (type IN ('INCOME', 'EXPENSE')),
  CONSTRAINT financial_entries_status_check CHECK (status IN ('PENDING', 'PAID')),
  CONSTRAINT financial_entries_amount_check CHECK (amount_cents > 0)
);

CREATE INDEX financial_entries_tenant_due_idx
ON financial_entries (tenant_id, due_at)
WHERE deleted_at IS NULL;

CREATE INDEX financial_entries_tenant_status_due_idx
ON financial_entries (tenant_id, status, due_at)
WHERE deleted_at IS NULL;

CREATE INDEX financial_entries_category_idx
ON financial_entries (category_id)
WHERE deleted_at IS NULL;

INSERT INTO permissions (key, description)
VALUES ('finance.manage', 'Criar e alterar categorias e lançamentos financeiros')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'finance.manage'
WHERE r.tenant_id IS NULL AND r.name IN ('ADMIN', 'FINANCE')
ON CONFLICT (role_id, permission_id) DO UPDATE SET deleted_at = NULL;
