import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const target = new URL('../backend/.env', import.meta.url);
if (!existsSync(target)) {
  const template = readFileSync(new URL('../backend/.env.example', import.meta.url), 'utf8');
  writeFileSync(target, template.replace('change-this-local-password', randomBytes(24).toString('hex')), {
    mode: 0o600,
  });
  console.log('Created backend/.env with a project-specific development password.');
} else {
  console.log('Using existing backend/.env.');
}
