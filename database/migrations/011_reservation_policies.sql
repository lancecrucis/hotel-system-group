CREATE TABLE hotel_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  check_in_time time NOT NULL DEFAULT '15:00',
  check_out_time time NOT NULL DEFAULT '11:00',
  cancellation_notice_hours integer NOT NULL DEFAULT 24 CHECK (cancellation_notice_hours BETWEEN 0 AND 168),
  no_show_grace_minutes integer NOT NULL DEFAULT 120 CHECK (no_show_grace_minutes BETWEEN 0 AND 1440),
  tax_rate numeric(5,2) NOT NULL DEFAULT 12 CHECK (tax_rate BETWEEN 0 AND 100),
  service_fee_rate numeric(5,2) NOT NULL DEFAULT 10 CHECK (service_fee_rate BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO hotel_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS cancellation_notice_hours integer NOT NULL DEFAULT 2
    CHECK (cancellation_notice_hours BETWEEN 0 AND 168),
  ADD COLUMN IF NOT EXISTS no_show_grace_minutes integer NOT NULL DEFAULT 30
    CHECK (no_show_grace_minutes BETWEEN 0 AND 1440);
