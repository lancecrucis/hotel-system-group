import type { PoolClient } from 'pg';
import { HttpError, text, uuid } from '../../../shared/utils/http.js';
import { lockedReservation, recordStatus, reservationSelect } from '../repositories/reservations.js';
import { allowedActions } from './status.js';

export const customerCancellationInput = {
  reservation_id: uuid,
  cancellation_reason: text(1000).min(1),
};

export async function prepareCustomerHotelCancellation(
  client: Pick<PoolClient, 'query'>,
  bookingReference: string,
  userId: string,
  reason: string,
) {
  if (!reason.trim()) throw new HttpError(400, 'Please provide a cancellation reason.');
  const reservation = (
    await client.query(`${reservationSelect} WHERE r.reservation_reference=$1 AND r.user_id=$2`, [bookingReference, userId])
  ).rows[0];
  if (!reservation || reservation.reservation_type !== 'hotel') throw new HttpError(404, 'Reservation not found.');
  if (!allowedActions(reservation.reservation_type, reservation.status, 'customer').includes('cancelled'))
    throw new HttpError(409, 'This reservation cannot be cancelled in its current status.');
  if (reservation.status === 'pending' && new Date(reservation.hold_expires_at).getTime() <= Date.now())
    throw new HttpError(409, 'The hold expired. Please book again.');
  const current = (await client.query("SELECT CURRENT_DATE::text AS day")).rows[0];
  if (reservation.hotel?.check_in < current.day)
    throw new HttpError(400, 'Please contact reception to change a past reservation.');
  if (reservation.status !== 'pending') {
    const cutoff = (
      await client.query(
        `SELECT (h.check_in + s.check_in_time - (s.cancellation_notice_hours * interval '1 hour')) <= timezone('Asia/Taipei', now()) AS closed
         FROM hotel_reservations h CROSS JOIN hotel_settings s WHERE h.reservation_id=$1`,
        [reservation.id],
      )
    ).rows[0];
    if (cutoff?.closed) throw new HttpError(409, 'The cancellation deadline has passed. Please contact the front desk.');
  }
  return reservation;
}

export async function cancelCustomerHotelReservation(
  client: PoolClient,
  reservationId: string,
  userId: string,
  reason: string,
) {
  const user = { id: userId, role: 'customer' as const };
  const reservation = await lockedReservation(client, reservationId, user);
  if (reservation.reservation_type !== 'hotel') throw new HttpError(400, 'Only hotel room reservations can be cancelled here.');
  if (!allowedActions(reservation.reservation_type, reservation.status, user.role).includes('cancelled'))
    throw new HttpError(409, 'This reservation cannot be cancelled in its current status.');
  if (reservation.status === 'pending' && new Date(reservation.hold_expires_at).getTime() <= Date.now())
    throw new HttpError(409, 'The hold expired. Please book again.');
  if (!reason.trim()) throw new HttpError(400, 'Please provide a cancellation reason.');

  const visit = (
    await client.query('SELECT check_in::text AS day FROM hotel_reservations WHERE reservation_id=$1', [reservationId])
  ).rows[0];
  const current = (await client.query("SELECT CURRENT_DATE::text AS day")).rows[0];
  if (visit?.day < current.day) throw new HttpError(400, 'Please contact reception to change a past reservation.');
  if (reservation.status !== 'pending') {
    const cutoff = (
      await client.query(
        `SELECT (h.check_in + s.check_in_time - (s.cancellation_notice_hours * interval '1 hour')) <= timezone('Asia/Taipei', now()) AS closed
         FROM hotel_reservations h CROSS JOIN hotel_settings s WHERE h.reservation_id=$1`,
        [reservationId],
      )
    ).rows[0];
    if (cutoff?.closed) throw new HttpError(409, 'The cancellation deadline has passed. Please contact the front desk.');
  }

  await client.query(
    `UPDATE reservations SET status='cancelled',updated_at=now(),hold_expires_at=NULL,cancelled_at=now(),cancellation_reason=$1 WHERE id=$2`,
    [reason, reservationId],
  );
  await recordStatus(client, reservation, 'cancelled', reason, userId);
  return (await client.query(`${reservationSelect} WHERE r.id=$1`, [reservationId])).rows[0];
}
