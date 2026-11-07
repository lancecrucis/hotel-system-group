import pg from 'pg';
import { env } from './env.js';
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  max: 10,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 30000,
  options: '-c timezone=Asia/Taipei',
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL connection error:', error.message);
});
