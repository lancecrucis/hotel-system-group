import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { requireUser, requireStaff } from '../../../middleware/auth.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { route, date, time, HttpError } from '../../../shared/utils/http.js';
import { contactSchema } from '../../hotel-reservations/routes/hotel.js';
import { expireHolds, recordStatus, audit } from '../../reservation-tracking/repositories/reservations.js';
import { peakOccupancy, minutes, clock } from '../repositories/capacity.js';

export const restaurantRouter = Router();
const search = z.object({ date, guests: z.coerce.number().int().min(1).max(500) });
const visitMinutes = 60;
const bufferMinutes = 30;
type DiningTable = { id: string; name: string; shape: string; capacity: number };
type TableBooking = { table_id: string | null; start_time: string; end_time: string };
const tableFree = (bookings: TableBooking[], tableId: string, start: number) =>
  !bookings.some(
    (booking) =>
      booking.table_id === tableId &&
      minutes(booking.start_time) < start + visitMinutes + bufferMinutes &&
      minutes(booking.end_time) + bufferMinutes > start,
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
    const current = (
      await pool.query("SELECT CURRENT_DATE::text AS today,to_char(LOCALTIME,'HH24:MI') AS time")
    ).rows[0];
    if (data.date < current.today) throw new HttpError(400, 'Choose today or a future date.');
    const tables = (await pool.query<DiningTable>('SELECT * FROM dining_tables ORDER BY name')).rows;
    const bookings = (
      await pool.query<TableBooking>(
        `SELECT d.table_id,d.start_time,d.end_time FROM restaurant_reservations d
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
      })
      .parse(req.body);
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
          'SELECT * FROM dining_tables WHERE ($1::uuid IS NULL OR id=$1) AND capacity >= $2 ORDER BY capacity,name',
          [data.table_id ?? null, data.guest_count],
        )
      ).rows;
      if (!tables.length) throw new HttpError(400, 'No table fits this party size.');
      const bookings = (
        await c.query<TableBooking>(
          `SELECT d.table_id,d.start_time,d.end_time FROM restaurant_reservations d
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
        `INSERT INTO reservations(user_id,reservation_type,total_amount,contact_name,contact_email,contact_phone,reservation_reference,hold_expires_at)
      VALUES($1,'restaurant',0,$2,$3,$4,$5,now()+interval '15 minutes') RETURNING *`,
        [
          req.user!.id,
          data.contact_name,
          data.contact_email,
          data.contact_phone,
          `DIN-${randomBytes(5).toString('hex').toUpperCase()}`,
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
        'pending',
        'Dining time held for 15 minutes. Confirm to complete your booking.',
        req.user!.id,
      );
      return r;
    });
    res.status(201).json({ reservation: result });
  }),
);
