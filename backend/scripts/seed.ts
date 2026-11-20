import { pool } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/modules/account-management/services/password.js';
if (env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(987322)');
  const password = await hashPassword('Prototype123!');
  const demoAccounts = [
    ['admin', 'Alex', 'admin@example.com'],
    ['staff', 'Sam', 'staff@example.com'],
    ['customer', 'Jamie', 'guest@example.com'],
  ] as const;
  for (const [role, first, email] of demoAccounts) {
    await c.query(
      `INSERT INTO users(role,first_name,last_name,email,password_hash,phone_number,email_verified_at) VALUES($1,$2,'Demo',$3,$4,'+63 917 123 4567',now()) ON CONFLICT(email) DO NOTHING`,
      [role, first, email, password],
    );
  }
  await c.query(
    'UPDATE users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE email = ANY($1::text[])',
    [demoAccounts.map(([, , email]) => email)],
  );
  const rooms = [
    [
      '101',
      'Standard Queen',
      3200,
      2,
      'Queen',
      1,
      'A comfortable room for a short stay.',
      'Courtyard view',
      false,
    ],
    [
      '102',
      'Standard Twin',
      3200,
      2,
      'Single',
      2,
      'Two separate beds and a practical workspace.',
      'Work desk',
      false,
    ],
    [
      '103',
      'Standard Queen',
      3200,
      2,
      'Queen',
      1,
      'A quiet room close to the lobby.',
      'Accessible shower',
      false,
    ],
    [
      '201',
      'Deluxe King',
      4500,
      2,
      'King',
      1,
      'Extra space with a seating area and natural light.',
      'Balcony, coffee maker',
      true,
    ],
    [
      '202',
      'Deluxe Twin',
      4500,
      3,
      'Double',
      2,
      'A generous room for friends or a small family.',
      'Balcony, coffee maker',
      true,
    ],
    [
      '301',
      'Family Suite',
      6500,
      4,
      'Queen',
      2,
      'A separate lounge and space for the whole family.',
      'Living area, kitchenette',
      true,
    ],
    [
      '302',
      'Family Suite',
      6500,
      4,
      'Queen',
      2,
      'A spacious suite for a relaxed family stay.',
      'Living area, kitchenette',
      true,
    ],
    [
      '401',
      'Executive Suite',
      8500,
      2,
      'King',
      1,
      'Our largest suite with a private lounge.',
      'Terrace, bathtub, living area',
      true,
    ],
  ];
  for (const [number, type, price, capacity, bed, count, description, amenities, breakfast] of rooms) {
    await c.query(
      `INSERT INTO rooms(room_number,room_type,price_per_night,capacity,bed_type,bed_count,description,special_amenities,breakfast_included) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(room_number) DO NOTHING`,
      [number, type, price, capacity, bed, count, description, amenities, breakfast],
    );
  }
  const sampleRatings = [
    ['101', 'Mia R.', 5, 'Comfortable room and a lovely stay.'],
    ['101', 'Daniel C.', 4, 'Clean, quiet, and great value.'],
    ['101', 'Lara S.', 5, 'Warm service and a very comfortable bed.'],
    ['102', 'Paolo M.', 5, 'The twin beds were perfect for our trip.'],
    ['102', 'Nina T.', 4, 'Neat room with everything we needed.'],
    ['103', 'Bea L.', 5, 'Peaceful room and helpful staff.'],
    ['201', 'Marco D.', 5, 'Spacious room with a beautiful balcony.'],
    ['201', 'Iris G.', 4, 'Lovely stay; breakfast was a nice bonus.'],
    ['202', 'Sam P.', 5, 'Plenty of room and a relaxing view.'],
    ['301', 'Jules A.', 5, 'The family had lots of space to unwind.'],
    ['302', 'Celine V.', 4, 'Bright, spacious, and comfortable.'],
    ['401', 'Theo B.', 5, 'A special stay with excellent amenities.'],
    ['401', 'Ana F.', 5, 'Beautiful suite and attentive service.'],
  ] as const;
  for (const [roomNumber, reviewer, rating, review] of sampleRatings) {
    await c.query(
      `INSERT INTO room_ratings(room_id,reviewer_name,rating,review_text)
       SELECT id,$2,$3,$4 FROM rooms WHERE room_number=$1
       ON CONFLICT(room_id,reviewer_name,review_text) DO NOTHING`,
      [roomNumber, reviewer, rating, review],
    );
  }
  await c.query(
    "INSERT INTO restaurant_settings(id,max_capacity,opening_time,closing_time,max_guest_per_booking) VALUES(1,40,'08:00','22:00',10) ON CONFLICT(id) DO NOTHING",
  );
  const guest = (await c.query("SELECT id FROM users WHERE email='guest@example.com'")).rows[0].id;
  for (const [type, ref] of [
    ['hotel', 'DEMO-HTL-001'],
    ['restaurant', 'DEMO-DIN-001'],
  ]) {
    const inserted = await c.query(
      `INSERT INTO reservations(user_id,reservation_type,status,total_amount,contact_name,contact_email,contact_phone,reservation_reference)
      VALUES($1,$2,'confirmed',$3,'Jamie Demo','guest@example.com','+63 917 123 4567',$4) ON CONFLICT(reservation_reference) DO NOTHING RETURNING id`,
      [guest, type, type === 'hotel' ? 9000 : 0, ref],
    );
    if (!inserted.rowCount) continue;
    const id = inserted.rows[0].id;
    if (type === 'hotel')
      await c.query(
        `INSERT INTO hotel_reservations(reservation_id,room_id,check_in,check_out,guest_count,price_per_night,special_requests)
      SELECT $1,id,CURRENT_DATE+1,CURRENT_DATE+3,2,4500,'A quiet room, please.' FROM rooms WHERE room_number='201'`,
        [id],
      );
    else
      await c.query(
        "INSERT INTO restaurant_reservations(reservation_id,reservation_date,start_time,end_time,guest_count,special_requests,table_id) VALUES($1,CURRENT_DATE+1,'18:00','19:00',4,'One vegetarian guest.',(SELECT id FROM dining_tables WHERE name='T05'))",
        [id],
      );
    await c.query(
      "INSERT INTO reservation_status_history(reservation_id,new_status,reason) VALUES($1,'confirmed','Demo reservation created.')",
      [id],
    );
    await c.query(
      "INSERT INTO notifications(user_id,reservation_id,title,message) VALUES($1,$2,'Booking confirmed',$3)",
      [guest, id, `Your demo reservation ${ref} is confirmed.`],
    );
  }
  await c.query('COMMIT');
  console.log(
    'Demo data ready. admin@example.com / staff@example.com / guest@example.com — password: Prototype123!',
  );
} catch (error) {
  await c.query('ROLLBACK');
  throw error;
} finally {
  c.release();
  await pool.end();
}
