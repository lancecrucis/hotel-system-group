import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../../../config/database.js';
import { env } from '../../../config/env.js';
import { requireUser, tokenHash } from '../../../middleware/auth.js';
import { HttpError, route, text, date } from '../../../shared/utils/http.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

export const authRouter = Router();

const profile = z.object({
  first_name: text(80).min(1),
  last_name: text(80).min(1),
  phone_number: text(18).regex(/^\+63[0-9 ]{9,14}$/, 'Use a Philippine number beginning with +63'),
  date_of_birth: date.nullable().optional(),
});

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128)
  .refine((p) => /[A-Z]/.test(p), 'Password must include at least one uppercase letter.')
  .refine((p) => /[a-z]/.test(p), 'Password must include at least one lowercase letter.')
  .refine((p) => /[0-9]/.test(p), 'Password must include at least one digit.')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must include at least one special character.');

const baseLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

const strictLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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


// -- GET /me --
authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

// -- POST /register --
authRouter.post(
  '/register',
  baseLimit,
  route(async (req, res) => {
    const data = z
      .object({
        ...profile.shape,
        email: z
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: strongPassword,
        confirm_password: z.string(),
      })
      .refine((d) => d.password === d.confirm_password, { message: 'Passwords do not match.', path: ['confirm_password'] })
      .parse(req.body);

    if (data.date_of_birth && data.date_of_birth > new Date().toISOString().slice(0, 10))
      throw new HttpError(400, 'Date of birth cannot be in the future.');

    const existing = await pool.query('SELECT 1 FROM users WHERE email=$1', [data.email]);
    if (existing.rows.length > 0)
      throw new HttpError(409, 'An account with this email already exists.');

    const result = await pool.query(
      `INSERT INTO users(first_name,last_name,email,password_hash,phone_number,date_of_birth)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id,role,first_name,last_name,email,phone_number,date_of_birth,email_verified_at`,
      [data.first_name, data.last_name, data.email, await hashPassword(data.password), data.phone_number, data.date_of_birth ?? null],
    );

    const user = result.rows[0];

    const verifyToken = randomBytes(32).toString('hex');
    await pool.query(
      "INSERT INTO email_verification_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [tokenHash(verifyToken), user.id],
    );

    sendVerificationEmail(user.email, verifyToken).catch((err) => console.error('[EMAIL] Failed:', err.message));

    res.status(201).json({
      message: 'Account created. Please check your email to verify your address before logging in.',
      ...(env.NODE_ENV !== 'production' ? { verify_link: `${env.CLIENT_ORIGIN}/verify-email?token=${verifyToken}` } : {}),
    });
  }),
);

// -- POST /login --
authRouter.post(
  '/login',
  baseLimit,
  route(async (req, res) => {
    const data = z
      .object({
        email: z
          .string()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(1),
        remember_me: z.boolean().optional(),
      })
      .parse(req.body);

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [data.email]);
    const user = result.rows[0];
    const valid = user
      ? await verifyPassword(data.password, user.password_hash)
      : false;

    if (!user || !valid) throw new HttpError(401, 'Incorrect email or password.');

    if (!user.email_verified_at)
      throw new HttpError(403, 'Please verify your email address before logging in. Check your inbox for a verification link.');

    await session(user.id, res, data.remember_me);
    const { password_hash: _password, ...safe } = user;
    res.json({ user: safe });
  }),
);

// -- GET /verify-email --
authRouter.get(
  '/verify-email',
  strictLimit,
  route(async (req, res) => {
    const token = z.string().min(1).parse(req.query.token);
    const hash = tokenHash(token);

    const result = await pool.query(
      'SELECT user_id,expires_at,used_at FROM email_verification_tokens WHERE token_hash=$1',
      [hash],
    );
    const record = result.rows[0];
    if (!record) throw new HttpError(400, 'Invalid verification link. Please request a new one.');
    if (record.used_at) throw new HttpError(400, 'This verification link has already been used.');
    if (new Date(record.expires_at) < new Date())
      throw new HttpError(400, 'Verification link has expired. Please request a new one.');

    await pool.query('UPDATE users SET email_verified_at=now() WHERE id=$1', [record.user_id]);
    await pool.query('UPDATE email_verification_tokens SET used_at=now() WHERE token_hash=$1', [hash]);

    res.json({ message: 'Email verified. You can now log in.' });
  }),
);

// -- POST /resend-verification --
authRouter.post(
  '/resend-verification',
  strictLimit,
  route(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().max(254).transform((v) => v.toLowerCase()) })
      .parse(req.body);

    const user = (await pool.query('SELECT id,email,email_verified_at FROM users WHERE email=$1', [email])).rows[0];
    if (!user) {
      res.json({ message: 'If this email is registered and unverified, a new link has been sent.' });
      return;
    }
    if (user.email_verified_at) {
      res.json({ message: 'This email is already verified. You can log in.' });
      return;
    }

    const recent = await pool.query(
      "SELECT COUNT(*) AS cnt FROM email_verification_tokens WHERE user_id=$1 AND created_at > now()-interval '1 hour'",
      [user.id],
    );
    if (Number(recent.rows[0].cnt) >= 3)
      throw new HttpError(429, 'Too many verification requests. Please try again later.');

    const verifyToken = randomBytes(32).toString('hex');
    await pool.query(
      "INSERT INTO email_verification_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [tokenHash(verifyToken), user.id],
    );

    sendVerificationEmail(user.email, verifyToken).catch((err) => console.error('[EMAIL] Failed:', err.message));

    res.json({
      message: 'If this email is registered and unverified, a new link has been sent.',
      ...(env.NODE_ENV !== 'production' ? { verify_link: `${env.CLIENT_ORIGIN}/verify-email?token=${verifyToken}` } : {}),
    });
  }),
);

// -- POST /forgot-password --
authRouter.post(
  '/forgot-password',
  strictLimit,
  route(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().max(254).transform((v) => v.toLowerCase()) })
      .parse(req.body);

    const user = (await pool.query('SELECT id,email FROM users WHERE email=$1', [email])).rows[0];
    if (!user) {
      res.json({ message: 'If this email has an account, a reset link has been sent.' });
      return;
    }

    const recent = await pool.query(
      "SELECT COUNT(*) AS cnt FROM password_reset_tokens WHERE user_id=$1 AND created_at > now()-interval '1 hour'",
      [user.id],
    );
    if (Number(recent.rows[0].cnt) >= 3)
      throw new HttpError(429, 'Too many reset requests. Please try again later.');

    const resetToken = randomBytes(32).toString('hex');
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);
    await pool.query(
      "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
      [tokenHash(resetToken), user.id],
    );

    sendPasswordResetEmail(user.email, resetToken).catch((err) => console.error('[EMAIL] Failed:', err.message));

    res.json({
      message: 'If this email has an account, a reset link has been sent.',
      ...(env.NODE_ENV !== 'production' ? { reset_link: `${env.CLIENT_ORIGIN}/reset-password?token=${resetToken}` } : {}),
    });
  }),
);

// -- POST /reset-password --
authRouter.post(
  '/reset-password',
  baseLimit,
  route(async (req, res) => {
    const data = z
      .object({
        token: z.string().min(1).max(128),
        password: strongPassword,
        confirm_password: z.string(),
      })
      .refine((d) => d.password === d.confirm_password, { message: 'Passwords do not match.', path: ['confirm_password'] })
      .parse(req.body);

    const hash = tokenHash(data.token);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const reset = (
        await client.query('SELECT user_id,expires_at,used_at FROM password_reset_tokens WHERE token_hash=$1 FOR UPDATE', [hash])
      ).rows[0];
      if (!reset) throw new HttpError(400, 'Reset link is invalid.');
      if (reset.used_at) throw new HttpError(400, 'This reset link has already been used.');
      if (new Date(reset.expires_at) < new Date()) throw new HttpError(400, 'Reset link has expired.');

      await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [
        await hashPassword(data.password),
        reset.user_id,
      ]);
      await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1', [hash]);
      await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [reset.user_id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ message: 'Password updated. All sessions have been revoked. Please log in again.' });
  }),
);


// -- POST /logout --

authRouter.post(
  '/logout',
  route(async (req, res) => {
    const cookieToken = req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (cookieToken) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(cookieToken)]);
    res.clearCookie('session', { path: '/' });
    res.json({ ok: true });
  }),
);

// -- PATCH /profile --
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
