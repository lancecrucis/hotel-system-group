import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { requireUser, requireStaff } from '../../../middleware/auth.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { route, uuid, text, date, time, money, HttpError } from '../../../shared/utils/http.js';
import { roomAvailable, validateStay } from '../repositories/rooms.js';
import { expireHolds, recordStatus, audit } from '../../reservation-tracking/repositories/reservations.js';
import { calculateHotelTotals } from '../services/billing.js';

export const hotelRouter = Router();
const safeImage = z.union([
  z.literal(''),
  z.url().refine((v) => /^https?:\/\//.test(v), 'Use an http or https image URL'),
]);
const roomSchema = z.object({
  room_number: text(20).min(1),
  room_type: text(80).min(1),
  description: text(2000),
  price_per_night: money,
  capacity: z.number().int().min(1).max(20),
  bed_type: text(80).min(1),
  bed_count: z.number().int().min(1).max(10),
  status: z.enum(['available', 'maintenance', 'inactive']),
  image_url: safeImage,
  has_wifi: z.boolean(),
  breakfast_included: z.boolean(),
  special_amenities: text(1000),
  images: z
    .array(safeImage.pipe(z.string().min(1)))
    .max(8)
    .default([]),
});
const hotelSettingsSchema = z.object({
  check_in_time: time,
  check_out_time: time,
  cancellation_notice_hours: z.number().int().min(0).max(168),
  no_show_grace_minutes: z.number().int().min(0).max(1440),
  tax_rate: z.number().min(0).max(100),
  service_fee_rate: z.number().min(0).max(100),
});
hotelRouter.get(
  '/settings',
  route(async (_req, res) => {
    res.json({ settings: (await pool.query('SELECT * FROM hotel_settings WHERE id=1')).rows[0] });
  }),
);
hotelRouter.put(
  '/settings',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    const data = hotelSettingsSchema.parse(req.body);
    await transaction(async (c) => {
      await c.query('SELECT id FROM hotel_settings WHERE id=1 FOR UPDATE');
      await c.query(
        'UPDATE hotel_settings SET check_in_time=$1,check_out_time=$2,cancellation_notice_hours=$3,no_show_grace_minutes=$4,tax_rate=$5,service_fee_rate=$6,updated_at=now() WHERE id=1',
        [data.check_in_time, data.check_out_time, data.cancellation_notice_hours, data.no_show_grace_minutes, data.tax_rate, data.service_fee_rate],
      );
      await audit(c, req.user!.id, 'update', 'hotel_settings', null, 'Updated hotel policies and room billing rates.');
    });
    res.json({ ok: true });
  }),
);
hotelRouter.get(
  '/rooms',
  route(async (req, res) => {
    const filter = z
      .object({
        check_in: date.optional(),
        check_out: date.optional(),
        guests: z.coerce.number().int().min(1).max(6).default(1),
        room_type: z.string().max(80).default(''),
        include_unavailable: z.coerce.boolean().default(false),
      })
      .parse(req.query);
    if (!!filter.check_in !== !!filter.check_out)
      throw new HttpError(400, 'Choose both check-in and check-out dates.');
    if (filter.check_in && !(await validateStay(pool, filter.check_in, filter.check_out!)))
      throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
    const result = await pool.query(
      `SELECT rm.*,
        COALESCE((SELECT json_agg(i ORDER BY i.display_order) FROM room_images i WHERE i.room_id=rm.id),'[]') AS images,
        COALESCE((SELECT round(avg(rr.rating)::numeric,1) FROM room_ratings rr WHERE rr.room_id=rm.id),0)::float AS rating,
        (SELECT count(*)::int FROM room_ratings rr WHERE rr.room_id=rm.id) AS rating_count
    FROM rooms rm WHERE ($1::boolean OR $2::boolean OR (status='available' AND housekeeping_status IN ('clean','inspected'))) AND capacity>=$3
    AND ($4::text='' OR room_type=$4) ORDER BY price_per_night,room_number`,
      [req.user?.role === 'staff' || req.user?.role === 'admin', filter.include_unavailable, filter.guests, filter.room_type],
    );
    const rooms = [];
    for (const room of result.rows) {
      const available =
        room.status === 'available' &&
        ['clean', 'inspected'].includes(room.housekeeping_status) &&
        (!filter.check_in || (await roomAvailable(pool, room.id, filter.check_in, filter.check_out!)));
      if (available || filter.include_unavailable || (req.user?.role !== 'customer' && req.user)) {
        rooms.push({
          ...room,
          available,
          availability_reason: available ? null : room.status === 'available' ? 'fully_booked' : 'unavailable',
        });
      }
    }
    const roomTypes = await pool.query(
      "SELECT DISTINCT room_type FROM rooms WHERE status='available' ORDER BY room_type",
    );
    res.json({ rooms, room_types: roomTypes.rows.map((row: { room_type: string }) => row.room_type) });
  }),
);
async function saveRoom(id: string | null, data: z.infer<typeof roomSchema>, actor: string) {
  return transaction(async (c) => {
    if (id) {
      const old = await c.query('SELECT id FROM rooms WHERE id=$1 FOR UPDATE', [id]);
      if (!old.rowCount) throw new HttpError(404, 'Room not found.');
      const conflict = await c.query(
        `SELECT 1 FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id WHERE h.room_id=$1
        AND r.status IN ('pending','confirmed','checked_in') AND (r.status<>'pending' OR r.hold_expires_at>now())
        AND (h.guest_count>$2 OR $3<>'available') LIMIT 1`,
        [id, data.capacity, data.status],
      );
      if (conflict.rowCount)
        throw new HttpError(
          409,
          'Active bookings prevent this capacity or room-status change. Resolve those bookings first.',
        );
    }
    const values = [
      data.room_number,
      data.room_type,
      data.description,
      data.price_per_night,
      data.capacity,
      data.bed_type,
      data.bed_count,
      data.status,
      data.image_url,
      data.has_wifi,
      data.breakfast_included,
      data.special_amenities,
    ];
    const result = id
      ? await c.query(
          `UPDATE rooms SET room_number=$1,room_type=$2,description=$3,price_per_night=$4,capacity=$5,bed_type=$6,bed_count=$7,status=$8,image_url=$9,has_wifi=$10,breakfast_included=$11,special_amenities=$12 WHERE id=$13 RETURNING *`,
          [...values, id],
        )
      : await c.query(
          `INSERT INTO rooms(room_number,room_type,description,price_per_night,capacity,bed_type,bed_count,status,image_url,has_wifi,breakfast_included,special_amenities) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          values,
        );
    const room = result.rows[0];
    await c.query('DELETE FROM room_images WHERE room_id=$1', [room.id]);
    for (const [index, url] of data.images.entries())
      await c.query(
        'INSERT INTO room_images(room_id,image_url,is_primary,display_order) VALUES($1,$2,$3,$4)',
        [room.id, url, index === 0, index],
      );
    await audit(c, actor, id ? 'update' : 'create', 'room', room.id, `Room ${room.room_number}`);
    return room;
  });
}
hotelRouter.post(
  '/rooms',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    res.status(201).json({ room: await saveRoom(null, roomSchema.parse(req.body), req.user!.id) });
  }),
);
hotelRouter.patch(
  '/rooms/:id',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    res.json({ room: await saveRoom(uuid.parse(req.params.id), roomSchema.parse(req.body), req.user!.id) });
  }),
);
hotelRouter.patch(
  '/rooms/:id/housekeeping',
  requireUser,
  requireStaff,
  route(async (req, res) => {
    const data = z
      .object({
        housekeeping_status: z.enum(['clean', 'inspected', 'dirty', 'cleaning', 'out_of_order']),
        housekeeping_notes: text(1000).default(''),
      })
      .parse(req.body);
    const room = await transaction(async (c) => {
      const current = (await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE', [uuid.parse(req.params.id)])).rows[0];
      if (!current) throw new HttpError(404, 'Room not found.');
      if (data.housekeeping_status === 'clean' || data.housekeeping_status === 'inspected') {
        const active = await c.query(
          "SELECT 1 FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id WHERE h.room_id=$1 AND r.status='checked_in' LIMIT 1",
          [current.id],
        );
        if (active.rowCount) throw new HttpError(409, 'A checked-in guest is still assigned to this room.');
      }
      const updated = await c.query(
        'UPDATE rooms SET housekeeping_status=$1,housekeeping_notes=$2,housekeeping_updated_at=now() WHERE id=$3 RETURNING *',
        [data.housekeeping_status, data.housekeeping_notes, current.id],
      );
      await audit(c, req.user!.id, 'housekeeping_update', 'room', current.id, `Room ${current.room_number}: ${data.housekeeping_status}.`);
      return updated.rows[0];
    });
    res.json({ room });
  }),
);
export const contactSchema = z.object({
  contact_name: text(160).min(2),
  contact_email: z.email().max(254),
  contact_phone: text(18).regex(/^\+63[0-9 ]{9,14}$/, 'Use a Philippine number beginning with +63'),
  special_requests: text(2000).default(''),
});
hotelRouter.post(
  '/reservations',
  requireUser,
  route(async (req, res) => {
    const data = contactSchema
      .extend({
        room_id: uuid,
        check_in: date,
        check_out: date,
        guest_count: z.number().int().min(1).max(6),
        walk_in: z.boolean().default(false),
      })
      .parse(req.body);
    const staffWalkIn = data.walk_in && req.user!.role !== 'customer';
    if (data.walk_in && !staffWalkIn) throw new HttpError(403, 'Staff access required for walk-in bookings.');
    const result = await transaction(async (c) => {
      const rooms = await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE', [data.room_id]);
      const room = rooms.rows[0];
      if (!room || room.status !== 'available' || !['clean', 'inspected'].includes(room.housekeeping_status) || room.capacity < data.guest_count)
        throw new HttpError(409, 'This room is not available for your party.');
      const nights = await validateStay(c, data.check_in, data.check_out);
      if (!nights) throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
      await expireHolds(c);
      if (!(await roomAvailable(c, room.id, data.check_in, data.check_out)))
        throw new HttpError(409, 'This room was just booked for those dates. Choose another room or dates.');
      const reference = `HTL-${randomBytes(5).toString('hex').toUpperCase()}`;
      const billing = (await c.query('SELECT tax_rate,service_fee_rate FROM hotel_settings WHERE id=1 FOR UPDATE')).rows[0];
      const totals = calculateHotelTotals(Number(room.price_per_night) * nights, Number(billing.tax_rate), Number(billing.service_fee_rate));
      const inserted = await c.query(
        `INSERT INTO reservations(user_id,created_by,booking_source,reservation_type,status,subtotal_amount,tax_amount,service_fee_amount,total_amount,contact_name,contact_email,contact_phone,reservation_reference,hold_expires_at)
      VALUES($1,$2,$3,'hotel',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          staffWalkIn ? null : req.user!.id,
          req.user!.id,
          staffWalkIn ? 'walk_in' : 'online',
          'confirmed',
          totals.subtotal,
          totals.tax,
          totals.serviceFee,
          totals.total,
          data.contact_name,
          data.contact_email,
          data.contact_phone,
          reference,
          null,
        ],
      );
      const r = inserted.rows[0];
      await c.query(
        `INSERT INTO hotel_reservations(reservation_id,room_id,check_in,check_out,guest_count,price_per_night,special_requests) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          r.id,
          room.id,
          data.check_in,
          data.check_out,
          data.guest_count,
          room.price_per_night,
          data.special_requests,
        ],
      );
      await recordStatus(
        c,
        { ...r, status: '' },
        'confirmed',
        staffWalkIn
          ? 'Walk-in room reservation created and confirmed by staff.'
          : 'Room reservation confirmed automatically.',
        req.user!.id,
      );
      if (staffWalkIn)
        await audit(
          c,
          req.user!.id,
          'create_walk_in',
          'reservation',
          r.id,
          `${reference}: hotel reservation for ${data.contact_name}.`,
        );
      return r;
    });
    res.status(201).json({ reservation: result });
  }),
);
