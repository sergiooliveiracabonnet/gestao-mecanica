ALTER TABLE service_orders
ADD COLUMN payment_installments INTEGER;

ALTER TABLE service_orders
ADD CONSTRAINT service_orders_payment_installments_check
CHECK (
  payment_installments IS NULL
  OR (payment_method = 'CREDIT_CARD' AND payment_installments BETWEEN 1 AND 24)
);
