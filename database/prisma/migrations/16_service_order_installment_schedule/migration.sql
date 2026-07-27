ALTER TABLE service_orders
ADD COLUMN payment_anticipated BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN payment_first_due_at TIMESTAMPTZ;

CREATE TABLE service_order_installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  service_order_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  installment_count INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  receipt_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT service_order_installments_values_check CHECK (
    installment_number >= 1 AND installment_number <= installment_count
    AND installment_count BETWEEN 1 AND 24
    AND amount_cents > 0
    AND status IN ('PENDING', 'PAID')
  )
);

CREATE INDEX service_order_installments_tenant_status_due_idx
ON service_order_installments (tenant_id, status, due_at);

CREATE INDEX service_order_installments_service_order_idx
ON service_order_installments (service_order_id);

CREATE UNIQUE INDEX service_order_installments_number_unique
ON service_order_installments (service_order_id, installment_number)
WHERE deleted_at IS NULL;
