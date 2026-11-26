# Hotel and Restaurant Reservation with Tracking System

A working school prototype of a hotel + restaurant booking system.

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** real PostgreSQL (data is really saved, not faked)
- **Users:** guests book, reception staff manage arrivals and payments, admins manage accounts

---

## 1. Install these first

| Tool | Why you need it | What to remember |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | to download the code | — |
| [Node.js 22.12+](https://nodejs.org/en/download) | runs the app | the installer already includes npm |
| [PostgreSQL](https://www.postgresql.org/download/) | the database itself | must include `initdb` and `pg_ctl` |

See [platform-specific setup](#more-setup-details) below if you need help installing these tools. Linux Mint instructions are included there.

Not sure if you have everything? After cloning, `npm run doctor` tells you which required tools are missing.

---

## 2. Download the project and choose your branch

Open PowerShell (Windows) or Terminal (Linux/macOS), then run:

```powershell
git clone https://github.com/lancecrucis/hotel-system-group.git
cd hotel-system-group
```

Switch to the branch already assigned to you:

```powershell
git switch kath
```

Use your own branch name in the command: `kath`, `jesus`, `redgie`, or `lance`. Do not create a new branch for this project.

---

## 3. Install and run

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173** in your browser. Keep the terminal open while using the app; press `Ctrl+C` to stop it. The database starts automatically and can remain running between sessions.

On the first run, the project also creates its local settings, database tables, and demo data. `npm run doctor` is an optional troubleshooting check if startup reports a missing tool.

---

## 4. Set up the database file

**You do not need to do anything here.** `npm run dev` creates `backend/.env` for you on the first run, with a random database password.

Just remember:

- `backend/.env` is private. It is ignored by Git, so never commit it.
- **Do not edit `PGPASSWORD` by hand.** The local database remembers the password it was first created with. Changing it in the file breaks the connection.

---

## 5. First-run details

The first `npm run dev` automatically:

1. Checks your machine (`doctor`)
2. Creates `backend/.env` with a random password
3. Starts a database just for this project
4. Creates all the tables
5. Adds demo rooms, tables, and accounts
6. Starts the frontend and the backend

The terminal keeps printing logs while the app is running. Leave it open.

To stop the apps, press `Ctrl+C`. The local database remains running between sessions.

### Hotel reservation assistant

The customer-facing assistant is available from the landing and room pages. It can search live room availability, prepare a room booking, prepare a room cancellation, and check the signed-in customer's reservation status. Booking and cancellation require the customer to review a confirmation card and click the backend confirmation button.

To enable the AI provider, add these values to `backend/.env`:

```text
MIXROUTE_API_KEY=your-server-side-key
MIXROUTE_BASE_URL=https://api.mixroute.ai/v1
MIXROUTE_MODEL=deepseek-v4-flash
```

The API key stays on the backend. If it is not configured, the rest of the reservation system still runs and assistant requests return a controlled configuration error. The assistant uses migration `015_assistant_confirmation_intents.sql` for short-lived, one-time confirmation requests.

### If `npm` does not work in PowerShell

Windows blocks `npm.ps1` on some machines. Use `npm.cmd` instead:

```powershell
npm.cmd ci
npm.cmd run doctor
npm.cmd run dev
```

---

## 6. Log in with a demo account

These are also shown on the sign-in page.

| Who | Email | Password |
| --- | --- | --- |
| Customer | `guest@example.com` | `Prototype123!` |
| Reception staff | `staff@example.com` | `Prototype123!` |
| Administrator | `admin@example.com` | `Prototype123!` |

Use these only on your own machine with the demo data.

---

## 7. Try the whole flow (about 5 minutes)

1. **Log in as the customer.**
2. Click **Book a room**, pick your dates, choose a room, continue.
3. Click **Confirm booking** — available rooms are confirmed immediately.
4. Check it under **My reservations**.
5. **Log out** and log in as staff.
6. Open your booking under **All reservations**.
7. Click **Check in**, then **Record payment**, then **Check out**.
   - Checkout refuses until the balance is fully paid. That is on purpose.
8. **For the restaurant:** book a table (confirmed immediately), then as staff click
   **Mark arrived → Seat guests → Complete visit**.

**To see a refund:** record a hotel payment first, cancel the booking (or finish the stay), then record a refund against that original payment.

---

## 8. Rules of the prototype

**Bookings**

- Available online room bookings are confirmed immediately; staff do not need to approve them.
- Available online dining bookings are also confirmed immediately (no guest hold step).
- Confirming a room booking does not require any payment.
- Hotel stays are **1 to 30 nights**.
- Check-in is from **3 PM**, check-out by **11 AM**.
- A room that still has a guest checked in cannot be booked again.
- Cancelled and completed bookings cannot be brought back.

**Restaurant**

- Tables have **2, 4, or 6 seats**.
- The system gives you the smallest table that fits your group.
- A table is blocked for your **1-hour visit plus 30 minutes** of cleaning time.
- Booking start times are every 30 minutes.
- There is **no visual floor plan**.

**Payments**

- **No online payment.** No cards, no GCash, no automatic charging.
- Payments and refunds are just records that staff type in for cash, bank transfer, or a card terminal.
- A "refund" only marks that money was returned outside the system. **The app does not move money.**
- Dining bills are not part of this system.

**Everything else**

- Notifications are **inside the app only** — no email, no SMS.
- Password reset links appear **on screen** in local development and expire after 15 minutes.
- Room photos are **URLs, not uploads**.
- Lists stop at **500** reservations/users and **200** notifications/activity entries.
- Staff have a **Housekeeping** queue (dirty → cleaning → clean → inspected). Check-in requires clean or inspected.
- Staff have a **Reports** page (date range, status breakdown, revenue, CSV export).
- No multi-hotel support, no Booking.com/Agoda integration, no online card gateway, no restaurant POS/floor plan, no waitlist.
- Prices display in **PHP (₱)**. To change currency, edit `frontend/src/utils/format.ts`.
- Dates and times use the **Asia/Taipei** timezone.

---

## 9. Where the code lives

```text
hotel-system-group/
├── backend/src/modules/       ← backend, split by feature
├── frontend/src/features/     ← frontend, split by the same features
├── database/migrations/       ← SQL changes, applied in order
├── scripts/                   ← doctor + setup helpers
├── tests/e2e/                 ← browser tests
├── docs/                      ← setup, ERD, API, workflows, team notes
└── package.json               ← all the commands
```

The four features repeat the same pattern. Learn it once, and every feature makes sense:

| Folder | Job | Analogy |
| --- | --- | --- |
| `routes/` | decides which URL calls which function | the door |
| `repositories/` | talks to the database | the kitchen |
| `services/` | the business rules in between | the waiter |

`backend/src/shared/` and `frontend/src/components/` are used by everyone, so coordinate before editing them.

---

## 10. Who owns what

| Member | Feature folder | Handles |
| --- | --- | --- |
| 1 | `account-management` | Login, sessions, profiles, roles |
| 2 | `hotel-reservations` | Rooms, availability, hotel bookings, housekeeping status |
| 3 | `restaurant-reservations` | Dining availability, tables, capacity |
| 4 | `reservation-tracking` | Statuses, history, payments, refunds, notifications, dashboard, reports |

**Ask the group before changing:**

- `frontend/src/components/` and `frontend/src/services/` (shared UI and API calls)
- `backend/src/shared/` (helpers used by every module)
- `database/migrations/` (everyone's data lives there)
- the root `package.json`

---

## 11. Commands cheat sheet

| Command | What it does |
| --- | --- |
| `npm run dev` | Set up everything and run the app |
| `npm run doctor` | Check if your machine is ready |
| `npm run dev:frontend` | Run only the frontend |
| `npm run dev:backend` | Run only the backend |
| `npm run db:start` / `npm run db:stop` | Start / stop the project database |
| `npm run db:migrate` | Apply new database changes |
| `npm run db:seed` | Add missing demo data |
| `npm run db:check` | Test the database connection |
| `npm run typecheck` | Find TypeScript errors |
| `npm run lint` | Check code style |
| `npm test` | Quick backend health tests |
| `npm run test:system` | Test real booking flows, including two people booking at once |
| `npm run test:e2e` | Test the real UI in a browser |
| `npm run build` | Build both apps for deployment |
| `npm run format` | Auto-format the code |

**For the browser test on a new machine, run this once first:**

```powershell
npx playwright install chromium
```

---

## 12. When something goes wrong

| What you see | What it means | Fix |
| --- | --- | --- |
| `npm.ps1 cannot be loaded` | PowerShell blocked the npm script | use `npm.cmd run dev` instead |
| `initdb` or `pg_ctl` was not found | PostgreSQL is missing or not on PATH | install PostgreSQL, or add its `bin` folder to PATH and reopen the terminal |
| `EADDRINUSE` | something else is using port 5173, 3000, or 5433 | close the other app or terminal, then retry |
| Password authentication failed | `PGPASSWORD` in `backend/.env` was edited | put the original password back, or delete `.local/` and `backend/.env`, then run `npm run dev` again |
| `Cannot find module` after pulling | new packages were added | run `npm ci` again |
| Page loads but every request fails | the backend is not running | check the terminal for an error — both servers must run from the same `npm run dev` |
| Node version error | Node is older than 22.12 | install the current LTS from nodejs.org |

---

## 13. Database safety rules

- The project database is `hotel_restaurant_dev` at `127.0.0.1:5433`.
- Its files live in `.local/postgres/`. **Never edit or delete that folder by hand.**
- It is separate from any PostgreSQL Windows service you may have installed. Leave that service alone.
- Every member gets their own separate local database. Nothing in `.local/` or `.env` reaches GitHub.
- `Ctrl+C` stops the app but not the database. To stop the database too:

  ```powershell
  npm run db:stop
  ```

- **Never change a migration that already ran.** Add a new `.sql` file to `database/migrations/` instead.
- Demo seeding never overwrites existing accounts, rooms, or settings, so it is safe to run again.

---

## More setup details

### Linux Mint installation

Install Git, curl, and PostgreSQL:

```bash
sudo apt update
sudo apt install -y git curl postgresql postgresql-client
```

Install Node.js 22 using `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version
npm --version
```

Node must be version `22.12` or newer, and npm must be version `10` or newer. If `nvm` is not found, restart Terminal and run `nvm install 22` and `nvm use 22`.

Mint installs PostgreSQL's `initdb` and `pg_ctl` in a versioned folder. Find it and add it to PATH for this Terminal, replacing `<version>` with the number shown (for example, `16`):

```bash
ls /usr/lib/postgresql
export PATH="/usr/lib/postgresql/<version>/bin:$PATH"
```

To keep this PATH setting in future Bash terminals, add it to `~/.bashrc`:

```bash
echo 'export PATH="/usr/lib/postgresql/<version>/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

The project runs its own local database on port `5433`; it does not use or modify Mint's system PostgreSQL service on port `5432`.

### Windows PowerShell note

If PowerShell blocks `npm.ps1`, use `npm.cmd` instead, for example `npm.cmd ci` and `npm.cmd run dev`.

### Branch workflow and updates

The team already has personal branches: `kath`, `jesus`, `redgie`, and `lance`. Work on your assigned branch and open a pull request into `main` when your work is ready. Do not commit feature work directly to `main`.

To update your branch with the latest shared `main`:

```bash
git fetch origin
git switch main
git pull origin main
git switch kath
git merge main
```

Replace `kath` with your assigned branch. If Git reports conflicts, resolve them before continuing; do not discard another member's changes to force a merge.

### PostgreSQL and local data

- PostgreSQL must include `initdb` and `pg_ctl`. On Windows, the project finds a standard installation under `C:\Program Files\PostgreSQL\<version>\`. On Linux and macOS, add the PostgreSQL `bin` folder to PATH.
- Each group member has a separate local database. `.local/` and `backend/.env` stay on that computer and are not committed.
- Do not edit `PGPASSWORD` after the local database is created; the saved database password must match it.
- `npm run db:stop` stops the project database. `npm run db:start` starts it again.
- Never edit a migration that has already run. Add a new SQL migration instead.

## 14. Deployment (later, not needed for the demo)

- `npm run build` puts the output in `frontend/dist/` and `backend/dist/`.
- Start the API with `npm start --workspace backend`.
- Serve the frontend with SPA fallback and proxy `/api` to Express on the same origin.
- Set `NODE_ENV=production`, real PostgreSQL credentials, and `CLIENT_ORIGIN`.
- Use HTTPS so session cookies stay secure.
- Demo accounts and the local database helper are for local demos only. A real deployment needs restricted database roles, backups, monitoring, and real business policies.

---

## 15. Developers

- Lance Crucis
- Katharine Batioco
- Redgie Blanco
- John Cruz
