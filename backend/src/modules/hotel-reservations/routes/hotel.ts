import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { requireUser, requireStaff } from '../../../middleware/auth.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { route, uuid, text, date, money, HttpError } from '../../../shared/utils/http.js';
import { roomAvailable, validateStay } from '../repositories/rooms.js';
import { expireHolds, recordStatus, audit } from '../../reservation-tracking/repositories/reservations.js';

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
hotelRouter.get(
  '/rooms',
  route(async (req, res) => {
    const filter = z
      .object({
        check_in: date.optional(),
        check_out: date.optional(),
        guests: z.coerce.number().int().min(1).max(6).default(1),
        room_type: z.string().max(80).default(''),
      })
      .parse(req.query);
    if (!!filter.check_in !== !!filter.check_out)
      throw new HttpError(400, 'Choose both check-in and check-out dates.');
    if (filter.check_in && !(await validateStay(pool, filter.check_in, filter.check_out!)))
      throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
    const result = await pool.query(
      `SELECT rm.*,COALESCE((SELECT json_agg(i ORDER BY i.display_order) FROM room_images i WHERE i.room_id=rm.id),'[]') AS images
    FROM rooms rm WHERE ($1::boolean OR status='available') AND capacity>=$2
    AND ($3::text='' OR room_type=$3) ORDER BY price_per_night,room_number`,
      [req.user?.role === 'staff' || req.user?.role === 'admin', filter.guests, filter.room_type],
    );
    const rooms = [];
    for (const room of result.rows) {
      const available =
        room.status === 'available' &&
        (!filter.check_in || (await roomAvailable(pool, room.id, filter.check_in, filter.check_out!)));
      if (available || (req.user?.role !== 'customer' && req.user)) rooms.push({ ...room, available });
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
      })
      .parse(req.body);
    const result = await transaction(async (c) => {
      const rooms = await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE', [data.room_id]);
      const room = rooms.rows[0];
      if (!room || room.status !== 'available' || room.capacity < data.guest_count)
        throw new HttpError(409, 'This room is not available for your party.');
      const nights = await validateStay(c, data.check_in, data.check_out);
      if (!nights) throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
      await expireHolds(c);
      if (!(await roomAvailable(c, room.id, data.check_in, data.check_out)))
        throw new HttpError(409, 'This room was just booked for those dates. Choose another room or dates.');
      const reference = `HTL-${randomBytes(5).toString('hex').toUpperCase()}`;
      const inserted = await c.query(
        `INSERT INTO reservations(user_id,reservation_type,total_amount,contact_name,contact_email,contact_phone,reservation_reference,hold_expires_at)
      VALUES($1,'hotel',$2,$3,$4,$5,$6,now()+interval '15 minutes') RETURNING *`,
        [
          req.user!.id,
          (Math.round(Number(room.price_per_night) * 100) * nights) / 100,
          data.contact_name,
          data.contact_email,
          data.contact_phone,
          reference,
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
        'pending',
        'Room held for 15 minutes. Confirm to complete your booking.',
        req.user!.id,
      );
      return r;
    });
    res.status(201).json({ reservation: result });
  }),
);
