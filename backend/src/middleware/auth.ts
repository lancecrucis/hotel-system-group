import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { pool } from '../config/database.js';
import { HttpError } from '../shared/utils/http.js';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const authenticate: RequestHandler = (request, _response, next) => {
  const token = request.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) {
    next();
    return;
  }
  void pool
    .query(
      `SELECT u.id,u.role,u.first_name,u.last_name,u.email,u.phone_number,u.date_of_birth
    FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
      [tokenHash(token)],
    )
    .then((result) => {
      request.user = result.rows[0];
      next();
    })
    .catch(next);
};
export const requireUser: RequestHandler = (req, _res, next) =>
  next(req.user ? undefined : new HttpError(401, 'Please sign in to continue.'));
export const requireStaff: RequestHandler = (req, _res, next) =>
  next(req.user && req.user.role !== 'customer' ? undefined : new HttpError(403, 'Staff access required.'));
export const requireAdmin: RequestHandler = (req, _res, next) =>
  next(req.user?.role === 'admin' ? undefined : new HttpError(403, 'Administrator access required.'));
