import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/config/database.js';

// Single pool: do NOT call pool.end() here — other integration tests share this pool.
// Data cleanup per test is sufficient.

const request = (base: string) =>
  async (path: string, method = 'GET', data?: unknown, cookie = '') => {
    const resp = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: resp.status,
      body: await resp.json().catch(() => ({})),
      cookie: resp.headers.get('set-cookie')?.split(';')[0] ?? '',
    };
  };

test('auth: full flow — register, verify, login, reset, revoke', async (context) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const req = request(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api`);
  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];

  context.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((e) => (e ? reject(e) : resolve()));
      server.closeAllConnections();
    });
    if (userIds.length) {
      await pool.query('DELETE FROM email_verification_tokens WHERE user_id=ANY($1::uuid[])', [userIds]);
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=ANY($1::uuid[])', [userIds]);
      await pool.query('DELETE FROM auth_sessions WHERE user_id=ANY($1::uuid[])', [userIds]);
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
    }
  });

  const user = {
    first_name: 'Auth', last_name: 'Test',
    email: `authtest-${suffix}@example.com`,
    password: 'Test123!', confirm_password: 'Test123!',
    phone_number: '+63 917 123 4567',
  };

  // -- REGISTRATION --
  const reg = await req('/auth/register', 'POST', user);
  assert.equal(reg.status, 201, `register: ${JSON.stringify(reg.body)}`);
  assert.ok(reg.body.message);
  assert.ok(!reg.body.user);
  assert.ok(reg.body.verify_link, 'dev should return verify link');
  assert.equal(reg.cookie, '');

  const uid = (await pool.query('SELECT id FROM users WHERE email=$1', [user.email])).rows[0];
  assert.ok(uid);
  userIds.push(uid.id);

  // Duplicate
  assert.equal((await req('/auth/register', 'POST', user)).status, 409);

  // Weak password
  assert.equal((await req('/auth/register', 'POST', { ...user, email: `x-${suffix}@x.com`, password: 'a', confirm_password: 'a' })).status, 400);

  // Mismatch
  assert.equal((await req('/auth/register', 'POST', { ...user, email: `x2-${suffix}@x.com`, confirm_password: 'wrong!' })).status, 400);

  // -- LOGIN BEFORE VERIFICATION --
  assert.equal((await req('/auth/login', 'POST', { email: user.email, password: user.password })).status, 403);

  // -- VERIFY EMAIL --
  const rawToken = new URL(reg.body.verify_link!).searchParams.get('token')!;
  assert.ok(rawToken);
  const verify = await req(`/auth/verify-email?token=${encodeURIComponent(rawToken)}`);
  assert.equal(verify.status, 200);
  assert.equal(verify.body.message, 'Email verified. You can now log in.');

  // Reused token
  assert.equal((await req(`/auth/verify-email?token=${encodeURIComponent(rawToken)}`)).status, 400);

  // -- LOGIN SUCCESS --
  const login = await req('/auth/login', 'POST', { email: user.email, password: user.password });
  assert.equal(login.status, 200, `login: ${JSON.stringify(login.body)}`);
  assert.ok(login.cookie);
  assert.equal(login.body.user.email, user.email);
  assert.equal(login.body.user.role, 'customer');

  // Bad password
  assert.equal((await req('/auth/login', 'POST', { email: user.email, password: 'Nope!' })).status, 401);

  // -- FORGOT PASSWORD --
  const forgot = await req('/auth/forgot-password', 'POST', { email: user.email });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.body.reset_link);

  // No such email — must not leak
  const noUserForgot = await req('/auth/forgot-password', 'POST', { email: `no-${suffix}@x.com` });
  assert.equal(noUserForgot.status, 200);
  assert.ok(!noUserForgot.body.reset_link);

  // -- RESET PASSWORD --
  const resetToken = new URL(forgot.body.reset_link!).searchParams.get('token')!;
  const loginCookie = login.cookie;

  const reset = await req('/auth/reset-password', 'POST', {
    token: resetToken, password: 'NewPass456!', confirm_password: 'NewPass456!',
  });
  assert.equal(reset.status, 200);

  // Session revoked
  const meAfter = await req('/auth/me', 'GET', undefined, loginCookie);
  assert.equal(meAfter.body.user, null);

  // Login with new password
  assert.equal((await req('/auth/login', 'POST', { email: user.email, password: 'NewPass456!' })).status, 200);

  // Weak reset password
  assert.equal((await req('/auth/reset-password', 'POST', { token: 'bad', password: 'x', confirm_password: 'x' })).status, 400);

  // -- RATE LIMIT ON RESEND (use a fresh unverified user) --
  const rateEmail = `rate-${suffix}@example.com`;
  await req('/auth/register', 'POST', {
    first_name: 'R', last_name: 'T', email: rateEmail,
    phone_number: '+63 917 123 4567', password: 'Test123!', confirm_password: 'Test123!',
  });
  const rateUid = (await pool.query('SELECT id FROM users WHERE email=$1', [rateEmail])).rows[0];
  if (rateUid) userIds.push(rateUid.id);

  for (let i = 0; i < 2; i++) {
      assert.equal((await req('/auth/resend-verification', 'POST', { email: rateEmail })).status, 200, `resend ${i}`);
    }
    assert.equal((await req('/auth/resend-verification', 'POST', { email: rateEmail })).status, 429, '3rd resend should be rate-limited');
});

test('auth: resend for verified email is harmless', async (context) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const req = request(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api`);
  const suffix = randomUUID().slice(0, 8);

  context.after(async () => {
    server.close();
    server.closeAllConnections();
    await pool.query('DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email=$1)', [`resend-${suffix}@example.com`]);
    await pool.query('DELETE FROM users WHERE email=$1', [`resend-${suffix}@example.com`]);
  });

  const email = `resend-${suffix}@example.com`;
  const r = await req('/auth/register', 'POST', {
    first_name: 'R', last_name: 'T', email,
    phone_number: '+63 917 123 4567', password: 'Test123!', confirm_password: 'Test123!',
  });
  assert.equal(r.status, 201);
  const token = new URL(r.body.verify_link!).searchParams.get('token')!;
  await req(`/auth/verify-email?token=${encodeURIComponent(token)}`);

  const resend = await req('/auth/resend-verification', 'POST', { email });
  assert.equal(resend.status, 200);
  assert.ok(resend.body.message.includes('already verified'));
});
