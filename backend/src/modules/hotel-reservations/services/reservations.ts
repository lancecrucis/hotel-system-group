import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { HttpError, date, text, uuid } from '../../../shared/utils/http.js';
import { expireHolds, recordStatus } from '../../reservation-tracking/repositories/reservations.js';
import { roomAvailable, validateStay } from '../repositories/rooms.js';
import { calculateHotelTotals } from './billing.js';

export const hotelReservationInput = z.object({
  room_id: uuid,
  check_in: date,
  check_out: date,
  guest_count: z.number().int().min(1).max(6),
  contact_name: text(160).min(2),
  contact_email: z.email().max(254),
  contact_phone: text(18).regex(/^\+63[0-9 ]{9,14}$/, 'Use a Philippine number beginning with +63'),
  special_requests: text(2000).default(''),
});

export type HotelReservationInput = z.infer<typeof hotelReservationInput>;

type ReservationActor = {
  id: string;
  role: 'customer' | 'staff' | 'admin';
};

export async function createHotelReservation(
  client: PoolClient,
  data: HotelReservationInput,
  actor: ReservationActor,
  options: { walkIn?: boolean } = {},
) {
  const staffWalkIn = Boolean(options.walkIn) && actor.role !== 'customer';
  const rooms = await client.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE', [data.room_id]);
  const room = rooms.rows[0];
  if (
    !room ||
    room.status !== 'available' ||
    !['clean', 'inspected'].includes(room.housekeeping_status) ||
    room.capacity < data.guest_count
  )
    throw new HttpError(409, 'This room is not available for your party.');

  const nights = await validateStay(client, data.check_in, data.check_out);
  if (!nights) throw new HttpError(400, 'Choose a future stay between 1 and 30 nights.');
  await expireHolds(client);
  if (!(await roomAvailable(client, room.id, data.check_in, data.check_out)))
    throw new HttpError(409, 'This room was just booked for those dates. Choose another room or dates.');

  const reference = `HTL-${randomBytes(5).toString('hex').toUpperCase()}`;
  const billing = (await client.query('SELECT tax_rate,service_fee_rate FROM hotel_settings WHERE id=1 FOR UPDATE')).rows[0];
  const totals = calculateHotelTotals(
    Number(room.price_per_night) * nights,
    Number(billing.tax_rate),
    Number(billing.service_fee_rate),
  );
  const inserted = await client.query(
    `INSERT INTO reservations(user_id,created_by,booking_source,reservation_type,status,subtotal_amount,tax_amount,service_fee_amount,total_amount,contact_name,contact_email,contact_phone,reservation_reference,hold_expires_at)
     VALUES($1,$2,$3,'hotel','confirmed',$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      staffWalkIn ? null : actor.id,
      actor.id,
      staffWalkIn ? 'walk_in' : 'online',
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
  const reservation = inserted.rows[0];
  await client.query(
    `INSERT INTO hotel_reservations(reservation_id,room_id,check_in,check_out,guest_count,price_per_night,special_requests)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [reservation.id, room.id, data.check_in, data.check_out, data.guest_count, room.price_per_night, data.special_requests],
  );
  await recordStatus(
    client,
    { ...reservation, status: '' },
    'confirmed',
    staffWalkIn ? 'Walk-in room reservation created and confirmed by staff.' : 'Room reservation confirmed automatically.',
    actor.id,
  );
  return reservation;
}
