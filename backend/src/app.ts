import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { HttpError } from './shared/utils/http.js';
import { authRouter } from './modules/account-management/routes/auth.js';
import { hotelRouter } from './modules/hotel-reservations/routes/hotel.js';
import { restaurantRouter } from './modules/restaurant-reservations/routes/restaurant.js';
import { trackingRouter } from './modules/reservation-tracking/routes/tracking.js';

export function createApp(checkDatabase: () => Promise<unknown> = () => pool.query('SELECT 1')) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'reservation-api' });
  });

  app.get('/api/health/database', async (_request, response) => {
    try {
      await checkDatabase();
      response.json({ status: 'ok', database: 'connected' });
    } catch {
      response.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
  });

  app.use('/api', (req, _res, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== env.CLIENT_ORIGIN
    ) {
      next(new HttpError(403, 'This request origin is not allowed.'));
      return;
    }
    next();
  });
  app.use('/api', authenticate);
  app.use('/api/auth', authRouter);
  app.use('/api/hotel', hotelRouter);
  app.use('/api/restaurant', restaurantRouter);
  app.use('/api', trackingRouter);
  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found' });
  });
  app.use(errorHandler);
  return app;
}
