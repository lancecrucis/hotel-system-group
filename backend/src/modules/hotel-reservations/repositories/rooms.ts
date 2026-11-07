import type { PoolClient } from 'pg';
export async function roomAvailable(
  client: Pick<PoolClient, 'query'>,
  roomId: string,
  start: string,
  end: string,
) {
  const result = await client.query(
    `SELECT 1 FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id
    WHERE h.room_id=$1 AND h.check_in<$3::date
    AND (h.check_out>$2::date OR (r.status='checked_in' AND $2::date<=CURRENT_DATE))
    AND (r.status IN ('confirmed','checked_in') OR (r.status='pending' AND r.hold_expires_at>now())) LIMIT 1`,
    [roomId, start, end],
  );
  return !result.rowCount;
}
export async function validateStay(client: Pick<PoolClient, 'query'>, start: string, end: string) {
  const result = await client.query(
    `SELECT $1::date>=CURRENT_DATE AS future, ($2::date-$1::date) AS nights`,
    [start, end],
  );
  const { future, nights } = result.rows[0];
  return future && nights >= 1 && nights <= 30 ? Number(nights) : null;
}
