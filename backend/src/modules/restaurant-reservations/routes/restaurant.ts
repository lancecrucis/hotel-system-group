import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { requireUser, requireStaff } from '../../../middleware/auth.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { route, uuid, text, date, time, HttpError } from '../../../shared/utils/http.js';
import { contactSchema } from '../../hotel-reservations/routes/hotel.js';
import { expireHolds, recordStatus, audit } from '../../reservation-tracking/repositories/reservations.js';
import { peakOccupancy, minutes, clock, tableFree, type DiningTable, type TableBooking } from '../repositories/capacity.js';

export const restaurantRouter = Router();
const search = z.object({ date, guests: z.coerce.number().int().min(1).max(500), time: time.optional() });
const visitMinutes = 60;
const tableSchema = z.object({
  name: text(40).min(1),
  shape: z.enum(['round', 'square', 'rectangle']),
  capacity: z.number().int().min(1).max(10),
  active: z.boolean().default(true),
});
restaurantRouter.get(
  '/tables',
  requireUser,
  requireStaff,
  route(async (_req, res) => {
    res.json({ tables: (await pool.query('SELECT * FROM dining_tables ORDER BY active DESC,name')).rows });
  }),
);
restaurantRouter.post(
  '/tables',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    const data = tableSchema.parse(req.body);
    const table = await transaction(async (c) => {
      const result = await c.query(
        'INSERT INTO dining_tables(name,shape,capacity,active) VALUES($1,$2,$3,$4) RETURNING *',
        [data.name, data.shape, data.capacity, data.active],
      );
      await audit(c, req.user!.id, 'create', 'dining_table', result.rows[0].id, `Table ${data.name}.`);
      return result.rows[0];
    });
    res.status(201).json({ table });
  }),
);
restaurantRouter.patch(
  '/tables/:id',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const data = tableSchema.parse(req.body);
    const table = await transaction(async (c) => {
      const current = (await c.query('SELECT * FROM dining_tables WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!current) throw new HttpError(404, 'Dining table not found.');
      if (!data.active || data.capacity < current.capacity) {
        const conflict = await c.query(
          `SELECT 1 FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id
           WHERE d.table_id=$1 AND d.reservation_date>=CURRENT_DATE
           AND r.status IN ('pending','confirmed','arrived','seated')
           AND (r.status<>'pending' OR r.hold_expires_at>now())
           AND (d.guest_count>$2 OR $3=false) LIMIT 1`,
          [id, data.capacity, data.active],
        );
        if (conflict.rowCount) throw new HttpError(409, 'Active reservations prevent reducing this table or taking it offline.');
        const remainingCapacity = (
          await c.query<{ capacity: number }>('SELECT COALESCE(max(capacity),0)::integer AS capacity FROM dining_tables WHERE active=true AND id<>$1', [id])
        ).rows[0].capacity;
        const settings = (await c.query<{ max_guest_per_booking: number }>('SELECT max_guest_per_booking FROM restaurant_settings WHERE id=1')).rows[0];
        if (remainingCapacity < settings.max_guest_per_booking)
          throw new HttpError(409, 'Keep at least one active table that can fit the restaurant party-size limit.');
      }
      const result = await c.query(
        'UPDATE dining_tables SET name=$1,shape=$2,capacity=$3,active=$4,updated_at=now() WHERE id=$5 RETURNING *',
        [data.name, data.shape, data.capacity, data.active, id],
      );
      await audit(c, req.user!.id, 'update', 'dining_table', id, `Table ${data.name}.`);
      return result.rows[0];
    });
    res.json({ table });
  }),
);
restaurantRouter.get(
  '/settings',
  route(async (_req, res) => {
    res.json({ settings: (await pool.query('SELECT * FROM restaurant_settings WHERE id=1')).rows[0] });
  }),
);
restaurantRouter.put(
  '/settings',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    const data = z
      .object({
        max_capacity: z.number().int().min(1).max(500),
        max_guest_per_booking: z.number().int().min(1),
        opening_time: time,
        closing_time: time,
      })
      .refine(
        (d) => d.max_guest_per_booking <= d.max_capacity && d.opening_time < d.closing_time,
        'Check capacity and opening hours.',
      )
      .parse(req.body);
    await transaction(async (c) => {
      await c.query('SELECT id FROM restaurant_settings WHERE id=1 FOR UPDATE');
      const largestTable = await c.query<{ capacity: number }>(
        "SELECT COALESCE(max(capacity),0)::integer AS capacity FROM dining_tables WHERE active=true",
      );
      if (data.max_guest_per_booking > largestTable.rows[0].capacity)
        throw new HttpError(400, `Party size cannot exceed the largest table (${largestTable.rows[0].capacity}).`);
      const conflict = await c.query(
        `SELECT 1 FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id
      WHERE d.reservation_date>=CURRENT_DATE AND r.status IN ('pending','confirmed','arrived','seated') AND (r.status<>'pending' OR r.hold_expires_at>now())
      AND (d.start_time<$1::time OR d.end_time>$2::time OR d.guest_count>$3) LIMIT 1`,
        [data.opening_time, data.closing_time, data.max_guest_per_booking],
      );
      if (conflict.rowCount)
        throw new HttpError(409, 'Existing reservations conflict with these hours or party-size limits.');
      const peak = await c.query(
        `WITH e AS (SELECT d.reservation_date AS day,d.start_time AS t,d.guest_count AS n FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id WHERE d.reservation_date>=CURRENT_DATE AND (r.status IN ('confirmed','arrived','seated') OR (r.status='pending' AND r.hold_expires_at>now())) UNION ALL SELECT d.reservation_date,d.end_time,-d.guest_count FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id WHERE d.reservation_date>=CURRENT_DATE AND (r.status IN ('confirmed','arrived','seated') OR (r.status='pending' AND r.hold_expires_at>now()))),g AS (SELECT day,t,sum(n) AS n FROM e GROUP BY day,t),p AS (SELECT sum(n) OVER (PARTITION BY day ORDER BY t) AS n FROM g) SELECT coalesce(max(n),0)::integer AS n FROM p`,
      );
      if (peak.rows[0].n > data.max_capacity)
        throw new HttpError(409, 'Existing reservations exceed the proposed capacity.');
      await c.query(
        'UPDATE restaurant_settings SET max_capacity=$1,max_guest_per_booking=$2,opening_time=$3,closing_time=$4,updated_at=now() WHERE id=1',
        [data.max_capacity, data.max_guest_per_booking, data.opening_time, data.closing_time],
      );
      await audit(
        c,
        req.user!.id,
        'update',
        'restaurant_settings',
        null,
        'Updated restaurant capacity and operating hours.',
      );
    });
    res.json({ ok: true });
  }),
);
restaurantRouter.get(
  '/availability',
  route(async (req, res) => {
    const data = search.parse(req.query);
    const settings = (await pool.query('SELECT * FROM restaurant_settings WHERE id=1')).rows[0];
    const requestedMinutes = data.time ? minutes(data.time) : null;
    if (
      requestedMinutes !== null &&
      (requestedMinutes < minutes(settings.opening_time) ||
        requestedMinutes + visitMinutes > minutes(settings.closing_time) ||
        (requestedMinutes - minutes(settings.opening_time)) % 30 !== 0)
    )
      throw new HttpError(400, 'Choose a reservation time on a 30-minute interval during opening hours.');
    const current = (
      await pool.query("SELECT CURRENT_DATE::text AS today,to_char(LOCALTIME,'HH24:MI') AS time")
    ).rows[0];
    if (data.date < current.today) throw new HttpError(400, 'Choose today or a future date.');
    const tables = (await pool.query<DiningTable>('SELECT * FROM dining_tables WHERE active=true ORDER BY name')).rows;
    const bookings = (
      await pool.query<TableBooking>(
        `SELECT d.table_id,d.start_time,d.end_time,
                to_char(d.completed_at,'HH24:MI') AS completed_time
         FROM restaurant_reservations d
         JOIN reservations r ON r.id=d.reservation_id
         WHERE d.reservation_date=$1 AND
         (r.status IN ('confirmed','arrived','seated','completed') OR
          (r.status='pending' AND r.hold_expires_at>now()))`,
        [data.date],
      )
    ).rows;
    const slots = [];
    for (
      let m = minutes(settings.opening_time);
      m + visitMinutes <= minutes(settings.closing_time);
      m += 30
    ) {
      if (requestedMinutes !== null && m !== requestedMinutes) continue;
      const start = clock(m),
        end = clock(m + visitMinutes);
      if (data.date === current.today && start <= current.time) continue;
      const available = settings.max_capacity - (await peakOccupancy(pool, data.date, start, end));
      const slotTables = tables.map((table) => ({
        ...table,
        available:
          table.capacity >= data.guests &&
          tableFree(bookings, table.id, m) &&
          data.guests <= available &&
          data.guests <= settings.max_guest_per_booking,
      }));
      slots.push({
        start_time: start,
        end_time: end,
        available_seats: Math.max(0, available),
        available: slotTables.some((table) => table.available),
        tables: slotTables,
      });
    }
    res.json({ slots, settings });
  }),
);
restaurantRouter.post(
  '/reservations',
  requireUser,
  route(async (req, res) => {
    const data = contactSchema
      .extend({
        reservation_date: date,
        start_time: time,
        guest_count: z.number().int().min(1).max(500),
        table_id: z.string().uuid().optional(),
        walk_in: z.boolean().default(false),
      })
      .parse(req.body);
    const staffWalkIn = data.walk_in && req.user!.role !== 'customer';
    if (data.walk_in && !staffWalkIn) throw new HttpError(403, 'Staff access required for walk-in bookings.');
    const result = await transaction(async (c) => {
      const settings = (await c.query('SELECT * FROM restaurant_settings WHERE id=1 FOR UPDATE')).rows[0];
      const current = (
        await c.query("SELECT CURRENT_DATE::text AS today,to_char(LOCALTIME,'HH24:MI') AS time")
      ).rows[0];
      const start = minutes(data.start_time),
        end = clock(start + visitMinutes);
      if (
        data.reservation_date < current.today ||
        (data.reservation_date === current.today && data.start_time <= current.time)
      )
        throw new HttpError(400, 'Choose a future dining time.');
      if (
        start < minutes(settings.opening_time) ||
        start + visitMinutes > minutes(settings.closing_time) ||
        (start - minutes(settings.opening_time)) % 30 !== 0 ||
        data.guest_count > settings.max_guest_per_booking
      )
        throw new HttpError(400, 'That time or party size is outside restaurant limits.');
      await expireHolds(c);
      const tables = (
        await c.query<DiningTable>(
          'SELECT * FROM dining_tables WHERE active=true AND ($1::uuid IS NULL OR id=$1) AND capacity >= $2 ORDER BY capacity,name',
          [data.table_id ?? null, data.guest_count],
        )
      ).rows;
      if (!tables.length) throw new HttpError(400, 'No table fits this party size.');
      const bookings = (
        await c.query<TableBooking>(
          `SELECT d.table_id,d.start_time,d.end_time,
                  to_char(d.completed_at,'HH24:MI') AS completed_time
           FROM restaurant_reservations d
         JOIN reservations r ON r.id=d.reservation_id
         WHERE d.reservation_date=$1 AND
         (r.status IN ('confirmed','arrived','seated','completed') OR
          (r.status='pending' AND r.hold_expires_at>now()))`,
          [data.reservation_date],
        )
      ).rows;
      const table = tables.find((candidate) => tableFree(bookings, candidate.id, start));
      if (!table) throw new HttpError(409, 'No tables are available at that time. Choose another time.');
      const occupied = await peakOccupancy(c, data.reservation_date, data.start_time, end);
      if (occupied + data.guest_count > settings.max_capacity)
        throw new HttpError(409, 'This time slot has filled up. Choose another time.');
      const inserted = await c.query(
        `INSERT INTO reservations(user_id,created_by,booking_source,reservation_type,status,total_amount,contact_name,contact_email,contact_phone,reservation_reference,hold_expires_at)
      VALUES($1,$2,$3,'restaurant',$4,0,$5,$6,$7,$8,$9) RETURNING *`,
        [
          staffWalkIn ? null : req.user!.id,
          req.user!.id,
          staffWalkIn ? 'walk_in' : 'online',
          staffWalkIn ? 'confirmed' : 'pending',
          data.contact_name,
          data.contact_email,
          data.contact_phone,
          `DIN-${randomBytes(5).toString('hex').toUpperCase()}`,
          staffWalkIn ? null : new Date(Date.now() + 15 * 60 * 1000),
        ],
      );
      const r = inserted.rows[0];
      await c.query(
        'INSERT INTO restaurant_reservations(reservation_id,reservation_date,start_time,end_time,guest_count,special_requests,table_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          r.id,
          data.reservation_date,
          data.start_time,
          end,
          data.guest_count,
          data.special_requests,
          table.id,
        ],
      );
      await recordStatus(
        c,
        { ...r, status: '' },
        staffWalkIn ? 'confirmed' : 'pending',
        staffWalkIn
          ? 'Walk-in dining reservation created and confirmed by staff.'
          : 'Dining time held for 15 minutes. Confirm to complete the booking.',
        req.user!.id,
      );
      if (staffWalkIn)
        await audit(
          c,
          req.user!.id,
          'create_walk_in',
          'reservation',
          r.id,
          `${r.reservation_reference}: dining reservation for ${data.contact_name}.`,
        );
      return r;
    });
    res.status(201).json({ reservation: result });
  }),
);
