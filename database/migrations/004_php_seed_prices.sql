UPDATE rooms SET price_per_night = CASE room_number
  WHEN '101' THEN 3200
  WHEN '201' THEN 4500
  WHEN '202' THEN 4500
  WHEN '301' THEN 6500
  WHEN '302' THEN 6500
  WHEN '401' THEN 8500
  ELSE price_per_night
END
WHERE room_number IN ('101','201','202','301','302','401');

UPDATE reservations SET total_amount = 9000
WHERE reservation_reference = 'DEMO-HTL-001';

UPDATE hotel_reservations SET price_per_night = 4500
WHERE reservation_id = (SELECT id FROM reservations WHERE reservation_reference = 'DEMO-HTL-001');

UPDATE users SET phone_number = '+63 917 123 4567'
WHERE email IN ('guest@example.com','staff@example.com','admin@example.com');
