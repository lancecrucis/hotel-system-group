import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { requireUser, requireStaff, requireAdmin } from '../../../middleware/auth.js';
import { transaction } from '../../../shared/utils/transaction.js';
import { route, uuid, text, money, HttpError } from '../../../shared/utils/http.js';
import {
  reservationSelect,
  expireHolds,
  lockedReservation,
  recordStatus,
  audit,
} from '../repositories/reservations.js';
import { allowedActions } from '../services/status.js';

export const trackingRouter = Router();
trackingRouter.use(['/reservations', '/notifications', '/dashboard', '/activity', '/users'], requireUser);
trackingRouter.get(
  '/reservations',
  route(async (req, res) => {
    await expireHolds();
    const filter = z
      .object({
        search: text(160).default(''),
        type: z.enum(['hotel', 'restaurant', 'all']).default('all'),
        status: text(40).default('all'),
      })
      .parse(req.query);
    const result = await pool.query(
      `${reservationSelect} WHERE ($1::uuid IS NULL OR r.user_id=$1)
    AND ($2='all' OR r.reservation_type=$2) AND ($3='all' OR r.status=$3)
    AND ($4='' OR r.reservation_reference ILIKE '%'||$4||'%' OR r.contact_name ILIKE '%'||$4||'%') ORDER BY r.created_at DESC LIMIT 500`,
      [req.user!.role === 'customer' ? req.user!.id : null, filter.type, filter.status, filter.search],
    );
    res.json({ reservations: result.rows });
  }),
);
trackingRouter.get(
  '/reservations/:id',
  route(async (req, res) => {
    await expireHolds();
    const id = uuid.parse(req.params.id);
    const result = await pool.query(
      `${reservationSelect} WHERE r.id=$1 AND ($2::uuid IS NULL OR r.user_id=$2)`,
      [id, req.user!.role === 'customer' ? req.user!.id : null],
    );
    const reservation = result.rows[0];
    if (!reservation) throw new HttpError(404, 'Reservation not found.');
    const [history, payments, refunds] = await Promise.all([
      pool.query(
        'SELECT h.*,u.first_name AS changed_by_name FROM reservation_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE reservation_id=$1 ORDER BY changed_at,id',
        [id],
      ),
      pool.query('SELECT * FROM payments WHERE reservation_id=$1 ORDER BY created_at', [id]),
      pool.query(
        'SELECT f.* FROM refunds f JOIN payments p ON p.id=f.payment_id WHERE p.reservation_id=$1 ORDER BY f.created_at',
        [id],
      ),
    ]);
    res.json({
      reservation,
      history: history.rows,
      payments: payments.rows,
      refunds: refunds.rows,
      allowed_actions: allowedActions(reservation.reservation_type, reservation.status, req.user!.role),
    });
  }),
);
trackingRouter.patch(
  '/reservations/:id/status',
  route(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const data = z.object({ status: text(30).min(1), reason: text(1000).default('') }).parse(req.body);
    await expireHolds();
    await transaction(async (c) => {
      const r = await lockedReservation(c, id, req.user);
      if (!allowedActions(r.reservation_type, r.status, req.user!.role).includes(data.status))
        throw new HttpError(409, 'This status change is not allowed. Refresh the reservation.');
      if (r.status === 'pending' && new Date(r.hold_expires_at).getTime() <= Date.now())
        throw new HttpError(409, 'The hold expired. Please book again.');
      if (data.status === 'cancelled' && !data.reason)
        throw new HttpError(400, 'Please provide a cancellation reason.');
      const schedule =
        r.reservation_type === 'hotel'
          ? await c.query('SELECT check_in::text AS day FROM hotel_reservations WHERE reservation_id=$1', [
              id,
            ])
          : await c.query(
              'SELECT reservation_date::text AS day,start_time::text AS time FROM restaurant_reservations WHERE reservation_id=$1',
              [id],
            );
      const current = (
        await c.query("SELECT CURRENT_DATE::text AS day,to_char(LOCALTIME,'HH24:MI:SS') AS time")
      ).rows[0];
      const visit = schedule.rows[0];
      if (['checked_in', 'arrived', 'seated', 'no_show'].includes(data.status) && visit.day > current.day)
        throw new HttpError(400, 'Arrival and no-show actions are available on the reservation date.');
      if (
        data.status === 'no_show' &&
        visit.day === current.day &&
        (r.reservation_type === 'hotel' ? '15:00:00' : visit.time) > current.time
      )
        throw new HttpError(400, 'The scheduled arrival time has not passed yet.');
      if (req.user!.role === 'customer' && visit.day < current.day)
        throw new HttpError(400, 'Please contact reception to change a past reservation.');
      if (data.status === 'checked_out') {
        const balance = await c.query(
          `SELECT r.total_amount-coalesce((SELECT sum(amount) FROM payments WHERE reservation_id=r.id),0)+coalesce((SELECT sum(f.refund_amount) FROM refunds f JOIN payments p ON p.id=f.payment_id WHERE p.reservation_id=r.id),0) AS due FROM reservations r WHERE r.id=$1`,
          [id],
        );
        if (Number(balance.rows[0].due) > 0)
          throw new HttpError(409, 'Record the outstanding payment before checking out.');
      }
      if (data.status === 'checked_in') {
        const roomId = (await c.query('SELECT room_id FROM hotel_reservations WHERE reservation_id=$1', [id]))
          .rows[0].room_id;
        await c.query('SELECT id FROM rooms WHERE id=$1 FOR UPDATE', [roomId]);
        const occupied = await c.query(
          "SELECT 1 FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id WHERE h.room_id=$1 AND r.status='checked_in' AND r.id<>$2",
          [roomId, id],
        );
        if (occupied.rowCount)
          throw new HttpError(
            409,
            'The previous guest is still checked in to this room. Check them out first.',
          );
      }
      await c.query(
        `UPDATE reservations SET status=$1,updated_at=now(),hold_expires_at=NULL,cancelled_at=CASE WHEN $1='cancelled' THEN now() ELSE cancelled_at END,cancellation_reason=CASE WHEN $1='cancelled' THEN $2 ELSE cancellation_reason END WHERE id=$3`,
        [data.status, data.reason, id],
      );
      const field: Record<string, string> = {
        checked_in: 'checked_in_at',
        checked_out: 'checked_out_at',
        arrived: 'arrived_at',
        seated: 'seated_at',
        completed: 'completed_at',
      };
      if (field[data.status])
        await c.query(
          `UPDATE ${r.reservation_type === 'hotel' ? 'hotel_reservations' : 'restaurant_reservations'} SET ${field[data.status]}=now() WHERE reservation_id=$1`,
          [id],
        );
      const reason = data.reason || `Reservation ${data.status.replaceAll('_', ' ')}.`;
      await recordStatus(c, r, data.status, reason, req.user!.id);
      if (req.user!.role !== 'customer')
        await audit(
          c,
          req.user!.id,
          'status_change',
          'reservation',
          id,
          `${r.reservation_reference}: ${r.status} → ${data.status}. ${data.reason}`,
        );
    });
    res.json({ ok: true });
  }),
);
trackingRouter.post(
  '/reservations/:id/payments',
  requireStaff,
  route(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const data = z
      .object({
        amount: money,
        payment_method: z.enum(['cash', 'bank_transfer', 'external_card']),
        transaction_reference: text(100).min(3),
      })
      .parse(req.body);
    await transaction(async (c) => {
      const r = await lockedReservation(c, id, req.user);
      if (!['confirmed', 'checked_in'].includes(r.status))
        throw new HttpError(409, 'Payments are accepted for confirmed or checked-in hotel reservations.');
      const paid = await c.query(
        'SELECT coalesce(sum(amount),0) AS n FROM payments WHERE reservation_id=$1',
        [id],
      );
      if (Math.round(data.amount * 100) > Math.round((Number(r.total_amount) - Number(paid.rows[0].n)) * 100))
        throw new HttpError(409, 'Payment exceeds the outstanding balance.');
      await c.query(
        'INSERT INTO payments(reservation_id,amount,payment_method,transaction_reference) VALUES($1,$2,$3,$4)',
        [id, data.amount, data.payment_method, data.transaction_reference],
      );
      await audit(
        c,
        req.user!.id,
        'record_payment',
        'reservation',
        id,
        `Recorded ${data.amount} via ${data.payment_method}.`,
      );
      await c.query('INSERT INTO notifications(user_id,reservation_id,title,message) VALUES($1,$2,$3,$4)', [
        r.user_id,
        id,
        'Payment recorded',
        `Payment of ${data.amount} recorded for ${r.reservation_reference}.`,
      ]);
    });
    res.status(201).json({ ok: true });
  }),
);
trackingRouter.post(
  '/reservations/:id/refunds',
  requireStaff,
  route(async (req, res) => {
    const id = uuid.parse(req.params.id);
    const data = z
      .object({ payment_id: uuid, refund_amount: money, refund_reason: text(1000).min(3) })
      .parse(req.body);
    await transaction(async (c) => {
      const r = await lockedReservation(c, id, req.user);
      if (!['cancelled', 'checked_out', 'completed', 'no_show'].includes(r.status))
        throw new HttpError(409, 'Finish or cancel the reservation before recording a refund.');
      const p = (
        await c.query('SELECT * FROM payments WHERE id=$1 AND reservation_id=$2 FOR UPDATE', [
          data.payment_id,
          id,
        ])
      ).rows[0];
      if (!p) throw new HttpError(404, 'Payment not found.');
      const prior = (
        await c.query('SELECT coalesce(sum(refund_amount),0) AS n FROM refunds WHERE payment_id=$1', [p.id])
      ).rows[0];
      const remaining = Math.round(Number(p.amount) * 100) - Math.round(Number(prior.n) * 100);
      if (Math.round(data.refund_amount * 100) > remaining)
        throw new HttpError(409, 'Refund exceeds the unrefunded payment amount.');
      await c.query(
        'INSERT INTO refunds(payment_id,refund_amount,refund_reason,refund_reference,processed_by) VALUES($1,$2,$3,$4,$5)',
        [
          p.id,
          data.refund_amount,
          data.refund_reason,
          `REF-${randomBytes(6).toString('hex').toUpperCase()}`,
          req.user!.id,
        ],
      );
      await c.query('UPDATE payments SET payment_status=$1,updated_at=now() WHERE id=$2', [
        Math.round(data.refund_amount * 100) === remaining ? 'refunded' : 'partially_refunded',
        p.id,
      ]);
      await audit(
        c,
        req.user!.id,
        'record_refund',
        'reservation',
        id,
        `Refund ${data.refund_amount}: ${data.refund_reason}`,
      );
      await c.query('INSERT INTO notifications(user_id,reservation_id,title,message) VALUES($1,$2,$3,$4)', [
        r.user_id,
        id,
        'Refund recorded',
        `A refund of ${data.refund_amount} was recorded for ${r.reservation_reference}.`,
      ]);
    });
    res.status(201).json({ ok: true });
  }),
);
trackingRouter.get(
  '/notifications',
  route(async (req, res) => {
    res.json({
      notifications: (
        await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [
          req.user!.id,
        ])
      ).rows,
    });
  }),
);
trackingRouter.patch(
  '/notifications/read',
  route(async (req, res) => {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user!.id]);
    res.json({ ok: true });
  }),
);
trackingRouter.get(
  '/dashboard',
  requireStaff,
  route(async (_req, res) => {
    await expireHolds();
    const result = await pool.query(`SELECT
    (SELECT count(*) FROM reservations WHERE status='pending')::integer AS pending,
    (SELECT count(*) FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id WHERE h.check_in=CURRENT_DATE AND r.status='confirmed')::integer AS arrivals,
    (SELECT count(*) FROM hotel_reservations h JOIN reservations r ON r.id=h.reservation_id WHERE h.check_out<=CURRENT_DATE AND r.status='checked_in')::integer AS departures,
    (SELECT count(*) FROM reservations WHERE status='checked_in')::integer AS in_house,
    (SELECT coalesce(sum(d.guest_count),0) FROM restaurant_reservations d JOIN reservations r ON r.id=d.reservation_id WHERE d.reservation_date=CURRENT_DATE AND r.status IN ('confirmed','arrived','seated'))::integer AS diners,
    (SELECT coalesce(sum(amount),0) FROM payments WHERE paid_at::date=CURRENT_DATE)-(SELECT coalesce(sum(refund_amount),0) FROM refunds WHERE processed_at::date=CURRENT_DATE) AS receipts,
    CURRENT_DATE::text AS today`);
    res.json({ summary: result.rows[0] });
  }),
);
trackingRouter.get(
  '/activity',
  requireStaff,
  route(async (_req, res) => {
    res.json({
      logs: (
        await pool.query(
          'SELECT l.*,u.first_name,u.last_name FROM admin_activity_logs l JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 200',
        )
      ).rows,
    });
  }),
);
trackingRouter.get(
  '/users',
  requireAdmin,
  route(async (_req, res) => {
    res.json({
      users: (
        await pool.query(
          'SELECT id,role,first_name,last_name,email,phone_number,created_at FROM users ORDER BY created_at DESC LIMIT 500',
        )
      ).rows,
    });
  }),
);
trackingRouter.patch(
  '/users/:id/role',
  requireAdmin,
  route(async (req, res) => {
    const id = uuid.parse(req.params.id),
      data = z.object({ role: z.enum(['customer', 'staff', 'admin']) }).parse(req.body);
    if (id === req.user!.id) throw new HttpError(400, 'You cannot change your own role.');
    await transaction(async (c) => {
      const result = await c.query('UPDATE users SET role=$1,updated_at=now() WHERE id=$2 RETURNING id', [
        data.role,
        id,
      ]);
      if (!result.rowCount) throw new HttpError(404, 'User not found.');
      await c.query('DELETE FROM auth_sessions WHERE user_id=$1', [id]);
      await audit(
        c,
        req.user!.id,
        'change_role',
        'user',
        id,
        `Assigned role ${data.role}. Existing sessions revoked.`,
      );
    });
    res.json({ ok: true });
  }),
);
