import dotenv from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().int().min(1).max(65535),
  PGDATABASE: z.string().min(1),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid backend environment. Run npm run setup and review backend/.env.\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
