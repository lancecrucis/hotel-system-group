CREATE TABLE dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  shape text NOT NULL CHECK (shape IN ('round', 'square', 'rectangle')),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 10)
);

INSERT INTO dining_tables(name, shape, capacity) VALUES
  ('T01', 'round', 2), ('T02', 'round', 2),
  ('T03', 'round', 2), ('T04', 'round', 2),
  ('T05', 'square', 4), ('T06', 'square', 4),
  ('T07', 'square', 4), ('T08', 'square', 4),
  ('T09', 'square', 4), ('T10', 'rectangle', 6),
  ('T11', 'rectangle', 6);

ALTER TABLE restaurant_reservations
  ADD COLUMN table_id uuid REFERENCES dining_tables(id);

CREATE INDEX ON restaurant_reservations(table_id, reservation_date, start_time);
