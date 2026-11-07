import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/config/database.js';
import { roomAvailable } from '../../src/modules/hotel-reservations/repositories/rooms.js';
import {
  peakOccupancy,
  minutes,
  clock,
} from '../../src/modules/restaurant-reservations/repositories/capacity.js';

test('real PostgreSQL workflows: auth, concurrency, inventory, capacity, status, payments, refunds, permissions and expiry', async (context) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`,
    suffix = randomUUID().slice(0, 8),
    userIds: string[] = [],
    reservationIds: string[] = [],
    roomIds: string[] = [];
  const request = async (path: string, method = 'GET', data?: unknown, cookie = '') => {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
    };
  };
  context.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((e) => (e ? reject(e) : resolve()));
      server.closeAllConnections();
    });
    if (reservationIds.length) {
      await pool.query(
        'DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE reservation_id=ANY($1::uuid[]))',
        [reservationIds],
      );
      await pool.query('DELETE FROM payments WHERE reservation_id=ANY($1::uuid[])', [reservationIds]);
      await pool.query('DELETE FROM notifications WHERE reservation_id=ANY($1::uuid[])', [reservationIds]);
      await pool.query('DELETE FROM reservations WHERE id=ANY($1::uuid[])', [reservationIds]);
    }
    await pool.query('DELETE FROM admin_activity_logs WHERE user_id=ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM rooms WHERE id=ANY($1::uuid[])', [roomIds]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
    await pool.end();
  });
  const register = async (name: string) => {
    const r = await request('/auth/register', 'POST', {
      first_name: 'Integration',
      last_name: name,
      email: `test-${name}-${suffix}@example.com`,
      password: 'Integration123!',
      phone_number: '+1 555 010 9999',
      role: 'admin',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.user.role, 'customer');
    userIds.push(r.body.user.id);
    return r;
  };
  const owner = await register('owner'),
    other = await register('other'),
    staff = await register('staff');
  await pool.query("UPDATE users SET role='staff' WHERE id=$1", [staff.body.user.id]);
  const contact = {
    contact_name: 'Integration Guest',
    contact_email: `test-owner-${suffix}@example.com`,
    contact_phone: '+1 555 010 9999',
    special_requests: 'Integration test',
  };
  assert.equal((await request('/reservations')).status, 401);
  assert.equal((await request('/users', 'GET', undefined, owner.cookie)).status, 403);
  assert.equal((await request('/users', 'GET', undefined, staff.cookie)).status, 403);
  const room = await request(
    '/hotel/rooms',
    'POST',
    {
      room_number: `TEST-${suffix}`,
      room_type: 'Integration Suite',
      description: 'Temporary test room',
      price_per_night: 100,
      capacity: 4,
      bed_type: 'Queen',
      bed_count: 2,
      status: 'available',
      image_url: '',
      has_wifi: true,
      breakfast_included: false,
      special_amenities: '',
      images: [],
    },
    staff.cookie,
  );
  assert.equal(room.status, 201);
  roomIds.push(room.body.room.id);
  const today = (
    await pool.query(
      'SELECT CURRENT_DATE::text AS today,(CURRENT_DATE+1)::text AS tomorrow,(CURRENT_DATE+2)::text AS later,(CURRENT_DATE+90)::text AS distant',
    )
  ).rows[0];
  const hotelData = {
    ...contact,
    room_id: room.body.room.id,
    check_in: today.today,
    check_out: today.tomorrow,
    guest_count: 2,
  };
  const simultaneous = await Promise.all([
    request('/hotel/reservations', 'POST', hotelData, owner.cookie),
    request('/hotel/reservations', 'POST', hotelData, owner.cookie),
  ]);
  assert.deepEqual(simultaneous.map((r) => r.status).sort(), [201, 409]);
  const booking = simultaneous.find((r) => r.status === 201)!.body.reservation;
  reservationIds.push(booking.id);
  assert.equal((await request(`/reservations/${booking.id}`, 'GET', undefined, other.cookie)).status, 404);
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'checked_in' }, owner.cookie))
      .status,
    409,
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'confirmed' }, owner.cookie))
      .status,
    200,
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'confirmed' }, owner.cookie))
      .status,
    409,
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'checked_in' }, staff.cookie))
      .status,
    200,
  );
  assert.equal(await roomAvailable(pool, room.body.room.id, today.today, today.tomorrow), false);
  assert.equal(
    await roomAvailable(pool, room.body.room.id, today.tomorrow, today.later),
    true,
    'A current stay must not block unrelated future dates after scheduled checkout.',
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'checked_out' }, staff.cookie))
      .status,
    409,
  );
  assert.equal(
    (
      await request(
        `/reservations/${booking.id}/payments`,
        'POST',
        { amount: 101, payment_method: 'cash', transaction_reference: `OVER-${suffix}` },
        staff.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        `/reservations/${booking.id}/payments`,
        'POST',
        { amount: 100, payment_method: 'cash', transaction_reference: `PAY-${suffix}` },
        staff.cookie,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        `/reservations/${booking.id}/payments`,
        'POST',
        { amount: 1, payment_method: 'cash', transaction_reference: `DUP-${suffix}` },
        staff.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/status`, 'PATCH', { status: 'checked_out' }, staff.cookie))
      .status,
    200,
  );
  const detail = (await request(`/reservations/${booking.id}`, 'GET', undefined, owner.cookie)).body;
  assert.equal(detail.history.length, 4);
  assert.equal(detail.reservation.status, 'checked_out');
  const refund = {
    payment_id: detail.payments[0].id,
    refund_amount: 50,
    refund_reason: 'Test partial refund',
  };
  assert.equal(
    (await request(`/reservations/${booking.id}/refunds`, 'POST', refund, owner.cookie)).status,
    403,
  );
  assert.equal(
    (await request(`/reservations/${booking.id}/refunds`, 'POST', refund, staff.cookie)).status,
    201,
  );
  const competing = await Promise.all([
    request(`/reservations/${booking.id}/refunds`, 'POST', { ...refund, refund_amount: 40 }, staff.cookie),
    request(`/reservations/${booking.id}/refunds`, 'POST', { ...refund, refund_amount: 40 }, staff.cookie),
  ]);
  assert.deepEqual(competing.map((r) => r.status).sort(), [201, 409]);
  const adjacent = await request(
    '/hotel/reservations',
    'POST',
    { ...hotelData, check_in: today.tomorrow, check_out: today.later },
    owner.cookie,
  );
  assert.equal(adjacent.status, 201);
  reservationIds.push(adjacent.body.reservation.id);
  await pool.query("UPDATE reservations SET hold_expires_at=now()-interval '1 second' WHERE id=$1", [
    adjacent.body.reservation.id,
  ]);
  const expired = await request(
    `/reservations/${adjacent.body.reservation.id}`,
    'GET',
    undefined,
    owner.cookie,
  );
  assert.equal(expired.body.reservation.status, 'expired');
  assert.equal(
    (
      await request(
        `/reservations/${adjacent.body.reservation.id}/status`,
        'PATCH',
        { status: 'confirmed' },
        owner.cookie,
      )
    ).status,
    409,
  );
  const settings = (await request('/restaurant/settings')).body.settings;
  const party = 2;
  const availability = await request(`/restaurant/availability?date=${today.distant}&guests=2`);
  const tableId = availability.body.slots[0].tables.find(
    (table: { name: string }) => table.name === 'T01',
  ).id;
  const dine = {
    ...contact,
    reservation_date: today.distant,
    start_time: settings.opening_time.slice(0, 5),
    guest_count: party,
    table_id: tableId,
  };
  const dining = await Promise.all(
    Array.from({ length: 2 }, () => request('/restaurant/reservations', 'POST', dine, owner.cookie)),
  );
  for (const result of dining) if (result.status === 201) reservationIds.push(result.body.reservation.id);
  assert.equal(dining.filter((r) => r.status === 201).length, 1);
  assert.equal(dining.filter((r) => r.status === 409).length, 1);
  const first = dining.find((r) => r.status === 201)!.body.reservation;
  assert.equal(
    (await request(`/reservations/${first.id}/status`, 'PATCH', { status: 'confirmed' }, owner.cookie))
      .status,
    200,
  );
  assert.equal(
    (await request(`/reservations/${first.id}/status`, 'PATCH', { status: 'arrived' }, staff.cookie)).status,
    400,
  );
  await pool.query(
    'UPDATE restaurant_reservations SET reservation_date=CURRENT_DATE WHERE reservation_id=$1',
    [first.id],
  );
  for (const status of ['arrived', 'seated', 'completed'])
    assert.equal(
      (await request(`/reservations/${first.id}/status`, 'PATCH', { status }, staff.cookie)).status,
      200,
    );
  // A table needs 30 minutes after the one-hour visit before its next booking.
  const opening = minutes(settings.opening_time);
  for (const start of [opening, opening + 90]) {
    const result = await request(
      '/restaurant/reservations',
      'POST',
      { ...dine, start_time: clock(start) },
      owner.cookie,
    );
    assert.equal(result.status, 201);
    reservationIds.push(result.body.reservation.id);
  }
  assert.equal(
    (
      await request(
        '/restaurant/reservations',
        'POST',
        { ...dine, start_time: clock(opening + 60) },
        owner.cookie,
      )
    ).status,
    409,
  );
  assert.equal(await peakOccupancy(pool, today.distant, clock(opening + 60), clock(opening + 150)), party);
  assert.equal(await peakOccupancy(pool, today.distant, clock(opening + 60), clock(opening + 90)), 0);
  const assigned = await request(
    '/restaurant/reservations',
    'POST',
    { ...dine, start_time: clock(opening + 180), table_id: undefined },
    owner.cookie,
  );
  assert.equal(assigned.status, 201);
  reservationIds.push(assigned.body.reservation.id);
  const assignedDetail = await request(
    `/reservations/${assigned.body.reservation.id}`,
    'GET',
    undefined,
    owner.cookie,
  );
  assert.equal(assignedDetail.body.reservation.restaurant.table_name, 'T01');
  const notices = await request('/notifications', 'GET', undefined, owner.cookie);
  assert.ok(notices.body.notifications.length >= 10);
  assert.equal((await request('/notifications/read', 'PATCH', {}, owner.cookie)).status, 200);
  assert.equal(
    (await request('/notifications', 'GET', undefined, owner.cookie)).body.notifications.every(
      (n: { is_read: boolean }) => n.is_read,
    ),
    true,
  );
  const csrf = await fetch(base + '/auth/logout', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', cookie: owner.cookie },
  });
  assert.equal(csrf.status, 403);
  assert.equal((await request('/auth/logout', 'POST', {}, owner.cookie)).status, 200);
  assert.equal((await request('/reservations', 'GET', undefined, owner.cookie)).status, 401);
  const settingsPayload = {
    max_capacity: settings.max_capacity,
    max_guest_per_booking: settings.max_guest_per_booking,
    opening_time: settings.opening_time.slice(0, 5),
    closing_time: settings.closing_time.slice(0, 5),
  };
  assert.equal((await request('/restaurant/settings', 'PUT', settingsPayload, other.cookie)).status, 403);
  assert.equal((await request('/restaurant/settings', 'PUT', settingsPayload, staff.cookie)).status, 200);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [staff.body.user.id]);
  const users = await request('/users', 'GET', undefined, staff.cookie);
  assert.equal(users.status, 200);
  assert.equal(
    users.body.users.some((u: Record<string, unknown>) => 'password_hash' in u),
    false,
  );
  assert.equal(
    (await request(`/users/${staff.body.user.id}/role`, 'PATCH', { role: 'customer' }, staff.cookie)).status,
    400,
  );
  assert.equal(
    (await request(`/users/${other.body.user.id}/role`, 'PATCH', { role: 'staff' }, staff.cookie)).status,
    200,
  );
  assert.equal((await request('/reservations', 'GET', undefined, other.cookie)).status, 401);
});
