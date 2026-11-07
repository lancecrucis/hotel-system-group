# Setup and development commands

## New group member

Install Node.js 22.12+ and PostgreSQL. Clone this repository, then from its root:

```powershell
npm install
npm run dev
```

This is an npm workspace: one root lockfile and installation cover the frontend/backend. Startup runs environment setup, local PostgreSQL startup, SQL migrations, idempotent demo seeding, and the two development servers.

Frontend: http://localhost:5173 · Backend: http://localhost:3000 · Local database: 127.0.0.1:5433. Demo accounts are listed in the root README.

If a port is occupied, stop the conflicting application. To change the API port, edit `PORT` in `backend/.env`; Vite reads it for its proxy. If changing the frontend origin/port, update `CLIENT_ORIGIN`, Vite's dev script, and browser test configuration together. Stop PostgreSQL before changing its port. Keep the generated PostgreSQL password consistent with its initialized cluster.

## Separate database steps

```powershell
npm run setup
npm run db:start
npm run db:migrate
npm run db:seed
npm run db:check
```

`backend/.env` is generated once with a random database password. `.local/` contains the local cluster/log files; never commit it. The helper binds only to loopback and leaves the installed Windows service alone. It starts an existing project cluster without resetting records. Run `npm run db:stop` to shut it down cleanly.

## Check your changes

```powershell
npm run lint
npm run typecheck
npm test
npm run test:system
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser test starts `npm run dev` when necessary. If the development server is already running, it reuses it. Tests use temporary, uniquely named records and clean up only their own data. Test against a development database, not real guest data.

## Original scaffolding and dependency commands

These commands explain how the foundation was assembled; do not rerun the generator in the existing frontend:

```powershell
npx.cmd --yes create-vite@latest frontend --template react-ts --no-interactive
# Initialize root/backend packages and configure the checked-in workspaces/scripts.
npm init -y
mkdir backend
cd backend
npm init -y
cd ..
npm install
npm install --save-dev concurrently prettier @playwright/test
npm install express pg cors helmet dotenv zod express-rate-limit --workspace backend
npm install --save-dev typescript tsx oxlint @types/node @types/express @types/pg @types/cors --workspace backend
npm install react-router-dom lucide-react --workspace frontend
```

Add new dependencies using the appropriate workspace flag and commit the root `package-lock.json`. Apply schema changes through new SQL files in `database/migrations/`; migrations use a database advisory lock and checksum validation. Demo seeding never updates existing user passwords, inventory, or settings.
