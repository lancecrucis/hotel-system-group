-- Demo: larger tables + higher party cap so busy/quiet hours can show different max party sizes.
ALTER TABLE dining_tables DROP CONSTRAINT IF EXISTS dining_tables_capacity_check;
ALTER TABLE dining_tables ADD CONSTRAINT dining_tables_capacity_check CHECK (capacity BETWEEN 1 AND 20);

INSERT INTO dining_tables(name, shape, capacity, active)
VALUES ('T12', 'rectangle', 12, true)
ON CONFLICT (name) DO UPDATE SET capacity = 12, active = true, updated_at = now();

INSERT INTO restaurant_settings(id, max_capacity, opening_time, closing_time, max_guest_per_booking)
VALUES (1, 40, '08:00', '22:00', 12)
ON CONFLICT (id) DO UPDATE SET
  max_capacity = 40,
  max_guest_per_booking = 12,
  updated_at = now();
