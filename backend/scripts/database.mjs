import { existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const action = process.argv[2];
if (!['start', 'stop', 'check'].includes(action)) throw new Error('Use start, stop, or check.');

const { PGHOST: host, PGPORT: port, PGDATABASE: database, PGUSER: user, PGPASSWORD: password } = process.env;
if (!host || !port || !database || !user || !password) throw new Error('Run npm run setup first.');
if (host !== '127.0.0.1') throw new Error('The managed development database requires PGHOST=127.0.0.1.');
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid PGPORT.');

const local = fileURLToPath(new URL('../../.local/', import.meta.url));
const data = join(local, 'postgres');

function findBinary(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  if (spawnSync(executable, ['--version'], { windowsHide: true, stdio: 'ignore' }).status === 0)
    return executable;
  if (process.platform === 'win32') {
    const base = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PostgreSQL');
    if (existsSync(base)) {
      const versions = readdirSync(base).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
      for (const version of versions) {
        const candidate = join(base, version, 'bin', executable);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  throw new Error(
    `PostgreSQL binary ${name} was not found. Install PostgreSQL and add its bin directory to PATH.`,
  );
}

function run(name, args, allowFailure = false) {
  const result = spawnSync(findBinary(name), args, { windowsHide: true, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0)
    throw new Error(`${name} failed with exit code ${result.status}.`);
  return result.status;
}

async function connect(databaseName) {
  const client = new pg.Client({
    host,
    port: Number(port),
    database: databaseName,
    user,
    password,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

if (action === 'check') {
  const client = await connect(database);
  try {
    const result = await client.query('SELECT current_database() AS database, version() AS version');
    console.log(result.rows[0]);
  } finally {
    await client.end();
  }
} else if (action === 'stop') {
  if (!existsSync(join(data, 'PG_VERSION'))) console.log('Project database has not been initialized.');
  else if (run('pg_ctl', ['-D', data, 'status'], true) === 0)
    run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
} else {
  mkdirSync(local, { recursive: true });
  if (!existsSync(join(data, 'PG_VERSION'))) {
    const passwordFile = join(local, 'postgres-password.tmp');
    writeFileSync(passwordFile, password, { mode: 0o600 });
    try {
      run('initdb', [
        '-D',
        data,
        '-U',
        user,
        `--pwfile=${passwordFile}`,
        '--auth-host=scram-sha-256',
        '--auth-local=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
      ]);
    } finally {
      unlinkSync(passwordFile);
    }
  }
  if (run('pg_ctl', ['-D', data, 'status'], true) !== 0) {
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      join(local, 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ]);
  }
  const admin = await connect('postgres');
  try {
    const result = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!result.rowCount) await admin.query(`CREATE DATABASE "${database.replaceAll('"', '""')}"`);
  } finally {
    await admin.end();
  }
  console.log(`Project database ready at ${host}:${port}/${database}`);
}
