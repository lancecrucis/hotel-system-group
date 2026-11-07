import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../../src/app.js';

test('health, readiness, and missing routes return the expected HTTP responses', async (context) => {
  let databaseAvailable = true;
  const server = createApp(async () => {
    if (!databaseAvailable) throw new Error('Database unavailable');
  }).listen(0, '127.0.0.1');
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-powered-by'), null);
  assert.deepEqual(await health.json(), { status: 'ok', service: 'reservation-api' });

  const ready = await fetch(`${base}/api/health/database`);
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: 'ok', database: 'connected' });

  databaseAvailable = false;
  const unavailable = await fetch(`${base}/api/health/database`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: 'unavailable', database: 'disconnected' });

  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Route not found' });
});
