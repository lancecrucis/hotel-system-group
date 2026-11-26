import { pool } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/modules/account-management/services/password.js';
if (env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(987322)');
  await c.query(`DELETE FROM rooms WHERE room_number='204' AND NOT EXISTS (SELECT 1 FROM hotel_reservations WHERE room_id=rooms.id)`);
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
      '104',
      'Garden Queen',
      3600,
      2,
      'Queen',
      1,
      'A bright queen room overlooking the courtyard garden.',
      'Garden view, reading chair',
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
      '203',
      'Balcony King',
      5200,
      2,
      'King',
      1,
      'A corner room with a private balcony and morning light.',
      'Private balcony, coffee maker',
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
      '303',
      'Junior Suite',
      7200,
      3,
      'Queen',
      1,
      'A separate sitting nook makes longer stays feel easy.',
      'Living area, soaking tub',
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
    [
      '402',
      'Family Room',
      9800,
      6,
      'Queen',
      3,
      'A bright three-bed room with space for six guests to relax together.',
      'Balcony, lounge seating, garden view',
      true,
    ],
    [
      '403',
      'Blue Triple Suite',
      10500,
      5,
      'Queen',
      3,
      'A spacious blue-toned three-bed suite for a group of five.',
      'Balcony, lounge seating, garden view',
      true,
    ],
    [
      '404',
      'Navy Family Room',
      10800,
      5,
      'Queen',
      3,
      'A modern navy-accented room with three beds and a shared sitting area.',
      'Lounge seating, garden view',
      true,
    ],
  ];
  for (const [number, type, price, capacity, bed, count, description, amenities, breakfast] of rooms) {
    await c.query(
      `INSERT INTO rooms(room_number,room_type,price_per_night,capacity,bed_type,bed_count,description,special_amenities,breakfast_included) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(room_number) DO NOTHING`,
      [number, type, price, capacity, bed, count, description, amenities, breakfast],
    );
  }
  await c.query(
    `UPDATE rooms SET image_url='/images/rooms/family-room-402.png' WHERE room_number='402'`,
  );
  for (const [imageUrl, displayOrder, isPrimary] of [
    ['/images/rooms/family-room-402.png', 0, true],
    ['/images/rooms/family-room-402-sage.png', 1, false],
  ] as const) {
    await c.query(
      `INSERT INTO room_images(room_id,image_url,is_primary,display_order)
       SELECT id,$1,$2,$3 FROM rooms WHERE room_number='402'
       AND NOT EXISTS (SELECT 1 FROM room_images WHERE room_id=rooms.id AND image_url=$1)`,
      [imageUrl, isPrimary, displayOrder],
    );
  }
  for (const [roomNumber, primaryImage, alternateImage] of [
    ['403', '/images/rooms/blue-triple-suite-403.png', '/images/rooms/navy-family-room-404.png'],
    ['404', '/images/rooms/navy-family-room-404.png', '/images/rooms/blue-triple-suite-403.png'],
  ] as const) {
    await c.query(`UPDATE rooms SET image_url=$1 WHERE room_number=$2`, [primaryImage, roomNumber]);
    for (const [imageUrl, displayOrder, isPrimary] of [
      [primaryImage, 0, true],
      [alternateImage, 1, false],
    ] as const) {
      await c.query(
        `INSERT INTO room_images(room_id,image_url,is_primary,display_order)
         SELECT id,$1,$2,$3 FROM rooms WHERE room_number=$4
         AND NOT EXISTS (SELECT 1 FROM room_images WHERE room_id=rooms.id AND image_url=$1)`,
        [imageUrl, isPrimary, displayOrder, roomNumber],
      );
    }
  }
  await c.query(
    `UPDATE rooms SET status='inactive' WHERE room_type = ANY($1::text[])`,
    [['Garden Queen', 'Deluxe Twin', 'Balcony King', 'Junior Suite']],
  );
  await c.query(`UPDATE rooms SET status='available' WHERE room_number='202'`);
  const sampleRatings = [
    ['101', 'Mia R.', 5, 'Comfortable room and a lovely stay.'],
    ['101', 'Daniel C.', 4, 'Clean, quiet, and great value.'],
    ['101', 'Lara S.', 5, 'Warm service and a very comfortable bed.'],
    ['102', 'Paolo M.', 5, 'The twin beds were perfect for our trip.'],
    ['102', 'Nina T.', 4, 'Neat room with everything we needed.'],
    ['103', 'Bea L.', 5, 'Peaceful room and helpful staff.'],
    ['104', 'Ella M.', 5, 'Lovely garden view and a restful night.'],
    ['104', 'Noah P.', 4, 'Bright room with a comfortable reading corner.'],
    ['201', 'Marco D.', 5, 'Spacious room with a beautiful balcony.'],
    ['201', 'Iris G.', 4, 'Lovely stay; breakfast was a nice bonus.'],
    ['203', 'Rina C.', 5, 'The balcony and morning light were wonderful.'],
    ['203', 'Adam J.', 4, 'A quiet corner room with a very comfortable bed.'],
    ['202', 'Sam P.', 5, 'Plenty of room and a relaxing view.'],
    ['301', 'Jules A.', 5, 'The family had lots of space to unwind.'],
    ['302', 'Celine V.', 4, 'Bright, spacious, and comfortable.'],
    ['303', 'Tess R.', 5, 'The sitting area made the suite feel special.'],
    ['303', 'Owen K.', 4, 'Spacious, quiet, and perfect for a longer stay.'],
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
    "INSERT INTO restaurant_settings(id,max_capacity,opening_time,closing_time,max_guest_per_booking) VALUES(1,40,'08:00','22:00',12) ON CONFLICT(id) DO UPDATE SET max_guest_per_booking=12, max_capacity=40, updated_at=now()",
  );
  const guest = (await c.query("SELECT id FROM users WHERE email='guest@example.com'")).rows[0].id;

  // Fixed busy/quiet ladder for the dining demo (real peak occupancy → real max_party_size).
  await c.query(
    `DELETE FROM restaurant_reservations WHERE reservation_id IN (
       SELECT id FROM reservations WHERE reservation_reference LIKE 'DEMO-CROWD-%'
     )`,
  );
  await c.query(`DELETE FROM reservations WHERE reservation_reference LIKE 'DEMO-CROWD-%'`);

  async function seedCrowdBlock(
    date: string,
    start: string,
    end: string,
    totalGuests: number,
    tableNames: string[],
  ) {
    if (totalGuests <= 0) return;
    const tables = (
      await c.query<{ id: string; capacity: number; name: string }>(
        'SELECT id, capacity, name FROM dining_tables WHERE name = ANY($1::text[]) AND active = true ORDER BY capacity DESC, name',
        [tableNames],
      )
    ).rows;
    let remaining = totalGuests;
    for (const table of tables) {
      if (remaining <= 0) break;
      const count = Math.min(remaining, table.capacity);
      const ref = `DEMO-CROWD-${date}-${start.replace(':', '')}-${table.name}`;
      const inserted = await c.query<{ id: string }>(
        `INSERT INTO reservations(user_id,reservation_type,status,total_amount,contact_name,contact_email,contact_phone,reservation_reference)
         VALUES($1,'restaurant','confirmed',0,'Demo Crowd','guest@example.com','+63 917 123 4567',$2)
         ON CONFLICT(reservation_reference) DO NOTHING RETURNING id`,
        [guest, ref],
      );
      if (!inserted.rowCount) {
        remaining -= count;
        continue;
      }
      await c.query(
        `INSERT INTO restaurant_reservations(reservation_id,reservation_date,start_time,end_time,guest_count,special_requests,table_id)
         VALUES($1,$2,$3,$4,$5,'Demo party for max-party-size ladder.',$6)`,
        [inserted.rows[0].id, date, start, end, count, table.id],
      );
      remaining -= count;
    }
  }

  // Keep T12 free so largest free table stays 12; drive max via peak occupancy:
  // max = min(12, free seats) where free seats = 40 - peak.
  // 60-min visits, tables clean 30 min after → same tables reusable every 90 min.
  const busyTables = ['T10', 'T11', 'T05', 'T06', 'T07', 'T08', 'T09', 'T01', 'T02', 'T03', 'T04']; // cap 40

  // 11/27/2026 — walk max 1→9 across the day, then quiet 12 at 21:00.
  // peak 39→avail 1→max 1 … peak 31→avail 9→max 9.
  const ladder1127: [string, string, number][] = [
    ['08:00', '09:00', 39], // max 1
    ['09:30', '10:30', 38], // max 2
    ['11:00', '12:00', 37], // max 3
    ['12:30', '13:30', 36], // max 4
    ['14:00', '15:00', 35], // max 5
    ['15:30', '16:30', 34], // max 6
    ['17:00', '18:00', 33], // max 7
    ['18:30', '19:30', 32], // max 8
    ['20:00', '21:00', 31], // max 9 — tables free again 21:30; 21:00 slot is quiet → max 12
  ];
  for (const [start, end, guests] of ladder1127) {
    await seedCrowdBlock('2026-11-27', start, end, guests, busyTables);
  }

  // 11/28/2026 — one medium rush (max 10), quiet otherwise (max 12)
  await seedCrowdBlock('2026-11-28', '13:00', '14:00', 30, busyTables);

  // 11/30/2026 — slightly lighter rush (max 11), quiet otherwise (max 12)
  await seedCrowdBlock('2026-11-30', '11:00', '12:00', 29, busyTables);

  for (const [type, ref] of [
    ['hotel', 'DEMO-HTL-001'],
    ['hotel', 'DEMO-HTL-002'],
    ['hotel', 'DEMO-HTL-003'],
    ['restaurant', 'DEMO-DIN-001'],
  ]) {
    const inserted = await c.query(
      `INSERT INTO reservations(user_id,reservation_type,status,total_amount,contact_name,contact_email,contact_phone,reservation_reference)
      VALUES($1,$2,'confirmed',$3,'Jamie Demo','guest@example.com','+63 917 123 4567',$4) ON CONFLICT(reservation_reference) DO NOTHING RETURNING id`,
      [guest, type, type === 'hotel' ? (ref === 'DEMO-HTL-002' ? 6400 : 9000) : 0, ref],
    );
    if (!inserted.rowCount) continue;
    const id = inserted.rows[0].id;
    if (type === 'hotel')
      await c.query(
        `INSERT INTO hotel_reservations(reservation_id,room_id,check_in,check_out,guest_count,price_per_night,special_requests)
      SELECT $1,id,CURRENT_DATE+1,CURRENT_DATE+3,2,CASE WHEN $2='103' THEN 3200 ELSE 4500 END,'A quiet room, please.' FROM rooms WHERE room_number=$2`,
        [id, ref === 'DEMO-HTL-002' ? '103' : ref === 'DEMO-HTL-003' ? '202' : '201'],
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
