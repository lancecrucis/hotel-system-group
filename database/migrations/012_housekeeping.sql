ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS housekeeping_status text NOT NULL DEFAULT 'clean'
    CHECK (housekeeping_status IN ('clean','inspected','dirty','cleaning','out_of_order')),
  ADD COLUMN IF NOT EXISTS housekeeping_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS housekeeping_updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS rooms_housekeeping_idx ON rooms(housekeeping_status, status);
