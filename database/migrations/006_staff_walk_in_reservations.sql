ALTER TABLE reservations
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN created_by uuid REFERENCES users(id),
  ADD COLUMN booking_source text NOT NULL DEFAULT 'online'
    CHECK (booking_source IN ('online', 'walk_in', 'phone', 'staff'));

UPDATE reservations
SET created_by = user_id
WHERE created_by IS NULL;

CREATE INDEX ON reservations(created_by, created_at DESC);
CREATE INDEX ON reservations(booking_source, created_at DESC);
