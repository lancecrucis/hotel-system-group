# Setup and development commands

## New group member

Install [Git](https://git-scm.com/downloads), [Node.js 22.12+](https://nodejs.org/en/download) (includes npm 10+), and [PostgreSQL](https://www.postgresql.org/download/). PostgreSQL must include `initdb` and `pg_ctl`. On Windows, the project finds installations in `C:\Program Files\PostgreSQL\<version>\bin` automatically. On macOS or Linux, add the PostgreSQL `bin` folder to PATH.

Open PowerShell or a terminal and run:

```powershell
git clone https://github.com/lancecrucis/hotel-system-group.git
cd hotel-system-group
npm ci
npm run doctor
npm run dev
```

Open http://localhost:5173. Run every command from the repository root (the folder containing `package.json`). One root lockfile installs frontend and backend dependencies. `npm run dev` creates `backend/.env` on first run, starts a project-local PostgreSQL cluster, applies pending migrations, adds demo data, and launches both servers. Every member gets a separate local database; nothing in `.local/` or `.env` is pushed to GitHub.

Frontend: http://localhost:5173 · Backend: http://localhost:3000 · Local database: 127.0.0.1:5433. Demo accounts are listed in the root README. Press Ctrl+C to stop the app servers; run `npm run db:stop` when you also want to stop the database.

## Common setup problems

| Message or symptom                                          | What to do                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.ps1 cannot be loaded` in PowerShell                    | Use `npm.cmd ci`, `npm.cmd run doctor`, and `npm.cmd run dev`.                                                                                                            |
| `initdb` or `pg_ctl` was not found                          | Install PostgreSQL with server tools. On Windows check `C:\Program Files\PostgreSQL\<version>\bin`; elsewhere add that folder to PATH and reopen the terminal.            |
| `EADDRINUSE` or a port is occupied                          | Close the other process using port 5173, 3000, or 5433, then retry.                                                                                                       |
| Database authentication fails after changing `backend/.env` | Restore the original password in `backend/.env`. The initialized local cluster keeps the password from its first setup. Ask a teammate before changing database settings. |
| Missing packages after pulling                              | Run `npm ci` again from the repository root.                                                                                                                              |

To change the API port, edit `PORT` in `backend/.env`; Vite reads it for its proxy. If changing the frontend origin/port, update `CLIENT_ORIGIN`, Vite's dev script, and browser test configuration together. Stop PostgreSQL before changing its port. Keep the generated PostgreSQL password consistent with its initialized cluster.

## Separate database steps

```powershell
npm run setup
npm run doctor
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
