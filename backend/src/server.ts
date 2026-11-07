import { createApp } from './app.js';
import { pool } from './config/database.js';
import { env } from './config/env.js';
import { expireHolds } from './modules/reservation-tracking/repositories/reservations.js';

const expiryTimer = setInterval(() => {
  void expireHolds().catch((error) => console.error('Hold expiry failed:', error.message));
}, 60000);
expiryTimer.unref();

const server = createApp().listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('API failed to start:', error.message);
  process.exitCode = 1;
});

function shutdown() {
  clearInterval(expiryTimer);
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
