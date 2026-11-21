UPDATE restaurant_settings
SET max_guest_per_booking = LEAST(
  max_guest_per_booking,
  COALESCE((SELECT max(capacity) FROM dining_tables), max_guest_per_booking)
)
WHERE id = 1;
