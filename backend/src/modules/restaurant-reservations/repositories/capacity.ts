import type { PoolClient } from 'pg';
export async function peakOccupancy(
  client: Pick<PoolClient, 'query'>,
  date: string,
  start: string,
  end: string,
) {
  const result = await client.query(
    `WITH booked AS (
    SELECT greatest(d.start_time,$2::time) AS begins,least(d.end_time,$3::time) AS ends,d.guest_count
    FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id
    WHERE d.reservation_date=$1 AND d.start_time<$3::time AND d.end_time>$2::time
    AND (r.status IN ('confirmed','arrived','seated') OR (r.status='pending' AND r.hold_expires_at>now()))
  ), events AS (
    SELECT begins AS t,guest_count AS delta FROM booked UNION ALL SELECT ends,-guest_count FROM booked
  ), sums AS (SELECT t,sum(delta) AS delta FROM events GROUP BY t), running AS (
    SELECT sum(delta) OVER (ORDER BY t) AS guests FROM sums
  ) SELECT COALESCE(max(guests),0)::integer AS peak FROM running`,
    [date, start, end],
  );
  return result.rows[0].peak as number;
}
export const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const clock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
