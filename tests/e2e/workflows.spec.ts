import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: 'backend/.env', quiet: true });
const suffix = Date.now().toString().slice(-8),
  roomNumber = `E2E-${suffix}`,
  email = `e2e-${suffix}@example.com`,
  reservationIds: string[] = [];
let roomId = '',
  userId = '';
function day(offset = 0) {
  const d = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()) + 'T12:00:00Z',
  );
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
test.afterAll(async () => {
  const client = new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  await client.connect();
  try {
    await client.query('DELETE FROM notifications WHERE reservation_id=ANY($1::uuid[])', [reservationIds]);
    await client.query(
      'DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE reservation_id=ANY($1::uuid[]))',
      [reservationIds],
    );
    await client.query('DELETE FROM payments WHERE reservation_id=ANY($1::uuid[])', [reservationIds]);
    await client.query('DELETE FROM admin_activity_logs WHERE entity_id=ANY($1::uuid[])', [
      [...reservationIds, ...(roomId ? [roomId] : [])],
    ]);
    await client.query('DELETE FROM reservations WHERE id=ANY($1::uuid[])', [reservationIds]);
    if (roomId) await client.query('DELETE FROM rooms WHERE id=$1', [roomId]);
    if (userId) await client.query('DELETE FROM users WHERE id=$1', [userId]);
  } finally {
    await client.end();
  }
});
test('guest and staff can complete hotel and dining workflows on desktop and mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  async function login(account: string) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(account);
    await page.getByLabel('Password', { exact: true }).fill('Prototype123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  }
  async function logout() {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  }
  async function status(name: string) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('status')).toContainText('Reservation updated.');
  }
  await login('admin@example.com');
  await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();
  await page.getByRole('link', { name: 'Room inventory' }).click();
  await page.getByRole('button', { name: 'Add room' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Room number', { exact: true }).fill(roomNumber);
  await dialog.getByLabel('Room type', { exact: true }).fill('Prototype Test Room');
  await dialog.getByLabel('Nightly rate (USD)').fill('110');
  await dialog.getByLabel('Description', { exact: true }).fill('Temporary room created by the browser test.');
  const roomResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/hotel/rooms') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Save room' }).click();
  roomId = (await (await roomResponse).json()).room.id;
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: roomNumber })).toBeVisible();
  await logout();
  await page.goto('/register');
  await page.getByLabel('First name').fill('Browser');
  await page.getByLabel('Last name').fill('Guest');
  await page.getByLabel('Phone number').fill('+1 555 010 3030');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Prototype123!');
  const register = page.waitForResponse((r) => r.url().endsWith('/api/auth/register'));
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  userId = (await (await register).json()).user.id;
  await expect(page.getByRole('heading', { name: 'Available rooms' })).toBeVisible();
  await page.getByLabel('Check-in', { exact: true }).fill(day());
  await page.getByLabel('Check-out', { exact: true }).fill(day(1));
  await page.getByRole('button', { name: 'Check availability' }).click();
  await page
    .getByRole('article')
    .filter({ hasText: roomNumber })
    .getByRole('button', { name: 'Select room' })
    .click();
  await expect(dialog.getByLabel('Contact name')).toHaveValue('Browser Guest');
  const hotel = page.waitForResponse(
    (r) => r.url().endsWith('/api/hotel/reservations') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Continue to confirmation' }).click();
  const hotelId = (await (await hotel).json()).reservation.id;
  reservationIds.push(hotelId);
  await page.waitForURL(`**/reservations/${hotelId}`);
  await status('Confirm booking');
  await expect(page.locator('.badge-confirmed')).toBeVisible();
  await logout();
  await login('staff@example.com');
  await page.goto(`/reservations/${hotelId}`);
  await status('Check in');
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await dialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Payment recorded.');
  await status('Check out');
  await expect(page.locator('.badge-checked_out')).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/overview.png', fullPage: true });
  await logout();
  await login(email);
  await page.goto(`/reservations/${hotelId}`);
  await expect(page.locator('.badge-checked_out')).toBeVisible();
  await expect(page.getByText('Prototype Test Room · ' + roomNumber)).toBeVisible();
  await page.getByRole('link', { name: 'Reserve a table' }).click();
  await expect(page.getByRole('heading', { name: 'Reserve a table' })).toBeVisible();
  await page.getByRole('radio', { name: /18:30/ }).check();
  await expect(page.getByLabel('Guests')).toHaveValue('2');
  const dining = page.waitForResponse(
    (r) => r.url().endsWith('/api/restaurant/reservations') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Continue to confirmation' }).click();
  const diningId = (await (await dining).json()).reservation.id;
  reservationIds.push(diningId);
  await page.waitForURL(`**/reservations/${diningId}`);
  await status('Confirm booking');
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await dialog.getByLabel('Cancellation reason').fill('Plans changed — browser test.');
  await dialog.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.badge-cancelled')).toBeVisible();
  await page.getByRole('link', { name: /Notifications/ }).click();
  await expect(page.getByText('Booking confirmations, status changes, and payment updates.')).toBeVisible();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.locator('article.unread')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rooms');
  await expect(page.getByRole('heading', { name: 'Available rooms' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('aside')).toHaveCount(0);
  const toggle = page.getByRole('navigation', { name: 'Booking type' });
  await toggle.getByRole('link', { name: 'Reserve a table' }).click();
  await expect(page.getByRole('heading', { name: 'Available dining times' })).toBeVisible();
  await expect(toggle.getByRole('link', { name: 'Reserve a table' })).toHaveAttribute('aria-current', 'page');
  await toggle.getByRole('link', { name: 'Book a room' }).click();
  await expect(page.getByRole('heading', { name: 'Available rooms' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
