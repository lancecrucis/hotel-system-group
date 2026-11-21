ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS service_fee_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_fee_amount >= 0);

UPDATE reservations
SET subtotal_amount = total_amount
WHERE reservation_type = 'hotel' AND subtotal_amount = 0 AND total_amount > 0;

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  subtotal_amount numeric(12,2) NOT NULL CHECK (subtotal_amount >= 0),
  tax_amount numeric(12,2) NOT NULL CHECK (tax_amount >= 0),
  service_fee_amount numeric(12,2) NOT NULL CHECK (service_fee_amount >= 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('issued','paid','void')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_issued_idx ON invoices(issued_at DESC);
