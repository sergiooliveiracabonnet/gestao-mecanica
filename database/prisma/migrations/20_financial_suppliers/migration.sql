CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  document TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  payment_terms TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT suppliers_status_check CHECK (status IN ('ACTIVE', 'BLOCKED'))
);

CREATE INDEX suppliers_tenant_name_idx ON suppliers (tenant_id, name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX suppliers_tenant_document_unique ON suppliers (tenant_id, document) WHERE deleted_at IS NULL AND document IS NOT NULL;

ALTER TABLE financial_entries ADD COLUMN supplier_id UUID;
CREATE INDEX financial_entries_supplier_idx ON financial_entries (supplier_id) WHERE deleted_at IS NULL;
