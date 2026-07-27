ALTER TABLE financial_entries ADD COLUMN customer_id UUID;
CREATE INDEX financial_entries_customer_idx ON financial_entries (customer_id) WHERE deleted_at IS NULL;
