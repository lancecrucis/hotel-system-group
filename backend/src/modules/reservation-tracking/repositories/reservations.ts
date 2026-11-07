import type { PoolClient } from 'pg';
import { pool } from '../../../config/database.js';
import { HttpError } from '../../../shared/utils/http.js';

export const reservationSelect = `SELECT r.*,
  (SELECT row_to_json(h) FROM (SELECT h.*,rm.room_number,rm.room_type FROM hotel_reservations h JOIN rooms rm ON rm.id=h.room_id WHERE h.reservation_id=r.id) h) AS hotel,
  (SELECT row_to_json(d) FROM restaurant_reservations d WHERE d.reservation_id=r.id) AS restaurant,
  COALESCE((SELECT sum(amount) FROM payments p WHERE p.reservation_id=r.id),0)::text AS paid_amount,
  COALESCE((SELECT sum(f.refund_amount) FROM refunds f JOIN payments p ON p.id=f.payment_id WHERE p.reservation_id=r.id),0)::text AS refunded_amount
  FROM reservations r`;

export async function expireHolds(client: Pick<PoolClient, 'query'> = pool) {
  await client.query(`WITH expired AS (
    UPDATE reservations SET status='expired',updated_at=now() WHERE status='pending' AND hold_expires_at<=now() RETURNING *
  ), history AS (
    INSERT INTO reservation_status_history(reservation_id,previous_status,new_status,reason)
    SELECT id,'pending','expired','The 15-minute confirmation hold expired.' FROM expired
  ) INSERT INTO notifications(user_id,reservation_id,title,message)
    SELECT user_id,id,'Reservation hold expired','Your hold for ' || reservation_reference || ' expired. Please book again.' FROM expired`);
}
export async function lockedReservation(client: PoolClient, id: string, user: Express.Request['user']) {
  const result = await client.query('SELECT * FROM reservations WHERE id=$1 FOR UPDATE', [id]);
  const r = result.rows[0];
  if (!r || (user?.role === 'customer' && r.user_id !== user.id))
    throw new HttpError(404, 'Reservation not found.');
  return r;
}
export async function recordStatus(
  client: PoolClient,
  r: { id: string; user_id: string; status: string; reservation_reference: string },
  status: string,
  reason: string,
  actor?: string,
) {
  await client.query(
    `INSERT INTO reservation_status_history(reservation_id,previous_status,new_status,reason,changed_by) VALUES($1,$2,$3,$4,$5)`,
    [r.id, r.status || null, status, reason, actor ?? null],
  );
  await client.query(`INSERT INTO notifications(user_id,reservation_id,title,message) VALUES($1,$2,$3,$4)`, [
    r.user_id,
    r.id,
    `Reservation ${status.replaceAll('_', ' ')}`,
    `${r.reservation_reference}: ${reason}`,
  ]);
}
export async function audit(
  client: Pick<PoolClient, 'query'>,
  userId: string,
  action: string,
  entity: string,
  id: string | null,
  description: string,
) {
  await client.query(
    `INSERT INTO admin_activity_logs(user_id,action,entity_type,entity_id,description) VALUES($1,$2,$3,$4,$5)`,
    [userId, action, entity, id, description],
  );
}
