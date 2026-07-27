CREATE TABLE service_order_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  service_order_id UUID NOT NULL,
  category TEXT NOT NULL,
  caption TEXT,
  storage_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT service_order_photos_category_check CHECK (category IN ('ENTRY', 'ISSUE', 'RESOLVED', 'EXIT'))
);

CREATE INDEX service_order_photos_tenant_order_category_idx
  ON service_order_photos (tenant_id, service_order_id, category)
  WHERE deleted_at IS NULL;
