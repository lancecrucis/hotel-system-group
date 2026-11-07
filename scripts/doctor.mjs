import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const problems = [];
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12)) {
  console.log(`Node.js ${process.versions.node}: ready`);
} else {
  problems.push(`Node.js 22.12 or newer is required (found ${process.versions.node}).`);
}

const npmVersion = process.env.npm_config_user_agent?.match(/\bnpm\/(\d+)\.(\d+)/);
if (npmVersion && Number(npmVersion[1]) >= 10) {
  console.log(`npm ${npmVersion[1]}.${npmVersion[2]}: ready`);
} else {
  problems.push('npm 10 or newer is required. Run this check with npm run doctor.');
}

function postgresBinary(name) {
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
  return null;
}

for (const name of ['initdb', 'pg_ctl']) {
  const binary = postgresBinary(name);
  if (binary) console.log(`PostgreSQL ${name}: ready (${binary})`);
  else problems.push(`PostgreSQL ${name} was not found. Install PostgreSQL and add its bin folder to PATH.`);
}

if (problems.length) {
  console.error('\nSetup needed:');
  for (const problem of problems) console.error(`- ${problem}`);
  console.error('See docs/SETUP.md for installation and troubleshooting steps.');
  process.exitCode = 1;
} else {
  console.log('Your machine is ready. Run npm run dev from the project root.');
}
