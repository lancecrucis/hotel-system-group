import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pool } from '../src/config/database.js';
const client = await pool.connect();
try {
  await client.query('SELECT pg_advisory_lock(987321)');
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const folder = new URL('../../database/migrations/', import.meta.url);
  for (const name of (await readdir(folder)).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, folder), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prior = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
    if (prior.rowCount) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(987321)');
  client.release();
  await pool.end();
}
