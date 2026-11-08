import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { env } from '../../../config/env.js';
import { requireUser, tokenHash } from '../../../middleware/auth.js';
import { HttpError, route, text, date } from '../../../shared/utils/http.js';
import { hashPassword, verifyPassword } from '../services/password.js';

export const authRouter = Router();
const profile = z.object({
  first_name: text(80).min(1),
  last_name: text(80).min(1),
  phone_number: text(18).regex(/^\+63[0-9 ]{9,14}$/, 'Use a Philippine number beginning with +63'),
  date_of_birth: date.nullable().optional(),
});
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
});
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});
async function session(userId: string, res: import('express').Response, remember = false) {
  const token = randomBytes(32).toString('hex');
  const duration = remember ? 30 : 1;
  await pool.query(
    "INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3::integer * interval '1 day'))",
    [tokenHash(token), userId, duration],
  );
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    ...(remember ? { maxAge: 30 * 86400000 } : {}),
    path: '/',
  });
}
authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});
authRouter.post(
  '/register',
  limit,
  route(async (req, res) => {
    const data = credentials.extend(profile.shape).parse(req.body);
    if (data.date_of_birth && data.date_of_birth > new Date().toISOString().slice(0, 10))
      throw new HttpError(400, 'Date of birth cannot be in the future.');
    const result = await pool.query(
      `INSERT INTO users(first_name,last_name,email,password_hash,phone_number,date_of_birth)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,role,first_name,last_name,email,phone_number,date_of_birth`,
      [
        data.first_name,
        data.last_name,
        data.email,
        await hashPassword(data.password),
        data.phone_number,
        data.date_of_birth ?? null,
      ],
    );
    await session(result.rows[0].id, res);
    res.status(201).json({ user: result.rows[0] });
  }),
);
authRouter.post(
  '/login',
  limit,
  route(async (req, res) => {
    const data = credentials.extend({ remember_me: z.boolean().optional() }).parse(req.body);
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [data.email]);
    const user = result.rows[0];
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ?? '00000000000000000000000000000000:' + '00'.repeat(64),
    );
    if (!user || !valid) throw new HttpError(401, 'Incorrect email or password.');
    await session(user.id, res, data.remember_me);
    const { password_hash: _password, ...safe } = user;
    res.json({ user: safe });
  }),
);
authRouter.post(
  '/forgot-password',
  limit,
  route(async (req, res) => {
    if (env.NODE_ENV === 'production')
      throw new HttpError(503, 'Password recovery requires an email service.');
    const { email } = credentials.pick({ email: true }).parse(req.body);
    const user = (await pool.query('SELECT id FROM users WHERE email=$1', [email])).rows[0];
    let resetLink: string | undefined;
    if (user) {
      const token = randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
      await pool.query(
        "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
        [tokenHash(token), user.id],
      );
      resetLink = `${env.CLIENT_ORIGIN}/reset-password?token=${token}`;
    }
    res.json({
      message: 'If this email has an account, use the reset link within 15 minutes.',
      reset_link: resetLink,
    });
  }),
);
authRouter.post(
  '/reset-password',
  limit,
  route(async (req, res) => {
    const { token, password } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: credentials.shape.password })
      .parse(req.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const reset = (
        await client.query(
          'SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>now() AND used_at IS NULL FOR UPDATE',
          [tokenHash(token)],
        )
      ).rows[0];
      if (!reset) throw new HttpError(400, 'Reset link is invalid or expired.');
      await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [
        await hashPassword(password),
        reset.user_id,
      ]);
      await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1', [
        tokenHash(token),
      ]);
      await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [reset.user_id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ ok: true });
  }),
);
authRouter.post(
  '/logout',
  route(async (req, res) => {
    const token = req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(token)]);
    res.clearCookie('session', { path: '/' });
    res.json({ ok: true });
  }),
);
authRouter.patch(
  '/profile',
  requireUser,
  route(async (req, res) => {
    const data = profile.parse(req.body);
    if (data.date_of_birth && data.date_of_birth > new Date().toISOString().slice(0, 10))
      throw new HttpError(400, 'Date of birth cannot be in the future.');
    const result = await pool.query(
      `UPDATE users SET first_name=$1,last_name=$2,phone_number=$3,date_of_birth=$4,updated_at=now() WHERE id=$5
    RETURNING id,role,first_name,last_name,email,phone_number,date_of_birth`,
      [data.first_name, data.last_name, data.phone_number, data.date_of_birth ?? null, req.user!.id],
    );
    res.json({ user: result.rows[0] });
  }),
);
