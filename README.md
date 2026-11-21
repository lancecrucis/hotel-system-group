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

> **Windows:** if you installed PostgreSQL in `C:\Program Files\PostgreSQL\<version>\`, the project finds it by itself. Nothing to configure.
>
> **Mac / Linux:** add the PostgreSQL `bin` folder to your PATH, then reopen the terminal.

Not sure if you have everything? Run `npm run doctor` in step 3 — it tells you exactly what is missing.

---

## 2. Get the code

Open PowerShell (or any terminal) and run:

```powershell
git clone https://github.com/lancecrucis/hotel-system-group.git
cd hotel-system-group
```

The project must be installed with Git. Do not use **Code → Download ZIP**, because a ZIP download does not include the Git history or make it easy to receive future updates.

### Branch workflow

`main` is the shared, stable branch. Do not make feature changes directly on `main`.

Each member should:

1. Update their local `main` branch.
2. Create a separate branch for their work, such as `lance`, `member-name/feature-name`, or `feature/feature-name`.
3. Make and test changes only on that branch.
4. Push the branch to GitHub.
5. Open a pull request from the work branch into `main`.

For example:

```powershell
git switch main
git pull origin main
git switch -c your-name/short-feature-name
```

Replace `your-name/short-feature-name` with your own branch name. If the team has already assigned you a branch, switch to that branch instead of creating another one.

### Get the latest code after cloning

If you already cloned the project, do not clone it again. From the project folder, run:

```powershell
git status
git switch main
git pull origin main
```

Then update your working branch with the latest `main`:

```powershell
git switch your-name/short-feature-name
git merge main
npm ci
```

If Git reports conflicts, resolve the marked files, test the project, and then complete the merge. Never delete other members' changes just to make the merge finish.

### Push your work and open a pull request

When your changes are tested:

```powershell
git status
git add .
git commit -m "Describe the change"
git push -u origin your-name/short-feature-name
```

On GitHub:

1. Open the repository and choose **Compare & pull request** for your pushed branch.
2. Set the base branch to `main`.
3. Add a clear title and explain what changed and how you tested it.
4. Request the required reviewer(s).
5. Wait for checks and approval, then merge the pull request when it is approved.

After the pull request is merged, refresh your local `main` before starting the next task:

```powershell
git switch main
git pull origin main
git branch -d your-name/short-feature-name
```

If the branch is still needed, keep it instead of deleting it. The branch deletion command only removes your local copy; it does not delete the project or other branches.

---

## 3. Install the packages

```powershell
npm ci
```

- Run this **once**, from the folder that contains `package.json` (the project root).
- It installs the packages for both the frontend and the backend. You do not run it twice.

Then check your machine:

```powershell
npm run doctor
```

You want to see `Your machine is ready.` at the end.

---

## 4. Set up the database file

**You do not need to do anything here.** `npm run dev` creates `backend/.env` for you on the first run, with a random database password.

Just remember:

- `backend/.env` is private. It is ignored by Git, so never commit it.
- **Do not edit `PGPASSWORD` by hand.** The local database remembers the password it was first created with. Changing it in the file breaks the connection.

---

## 5. Run it

One terminal is enough — this command runs both the frontend and the backend together.

```powershell
npm run dev
```

Then open **http://localhost:5173** in your browser.

**What happens automatically on the first run:**

1. Checks your machine (`doctor`)
2. Creates `backend/.env` with a random password
3. Starts a database just for this project
4. Creates all the tables
5. Adds demo rooms, tables, and accounts
6. Starts the frontend and the backend

**What is normal to see:** the terminal keeps printing logs and never "finishes". That means it is working. Leave the window open.

**To stop everything:** press `Ctrl+C` in that terminal.

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
3. Click **Confirm booking** — you have **15 minutes** to do this.
4. Check it under **My reservations**.
5. **Log out** and log in as staff.
6. Open your booking under **All reservations**.
7. Click **Check in**, then **Record payment**, then **Check out**.
   - Checkout refuses until the balance is fully paid. That is on purpose.
8. **For the restaurant:** book a table, confirm it, then as staff click
   **Mark arrived → Seat guests → Complete visit**.

**To see a refund:** record a hotel payment first, cancel the booking (or finish the stay), then record a refund against that original payment.

---

## 8. Rules of the prototype

**Bookings**

- An unconfirmed booking only holds the room for **15 minutes**, then it expires.
- Confirming does not require any payment.
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
- No housekeeping module, no multi-hotel support, no Booking.com/Agoda integration.
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
| 2 | `hotel-reservations` | Rooms, availability, hotel bookings |
| 3 | `restaurant-reservations` | Dining availability, tables, capacity |
| 4 | `reservation-tracking` | Statuses, history, payments, refunds, notifications, dashboard |

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

## 14. Deployment (later, not needed for the demo)

- `npm run build` puts the output in `frontend/dist/` and `backend/dist/`.
- Start the API with `npm start --workspace backend`.
- Serve the frontend with SPA fallback and proxy `/api` to Express on the same origin.
- Set `NODE_ENV=production`, real PostgreSQL credentials, and `CLIENT_ORIGIN`.
- Use HTTPS so session cookies stay secure.
- Demo accounts and the local database helper are for local demos only. A real deployment needs restricted database roles, backups, monitoring, and real business policies.

---

## 15. Read more

- [Setup details and more troubleshooting](docs/SETUP.md)
- [ERD mapping](docs/database/ERD.md)
- [API reference](docs/api/README.md)
- [Workflow research](docs/architecture/WORKFLOWS.md)
- [Team conventions](docs/team/README.md)

---

## Copy-paste quick start

```powershell
git clone https://github.com/lancecrucis/hotel-system-group.git
cd hotel-system-group
npm ci
npm run doctor
npm run dev
```

Then open http://localhost:5173 and log in as `guest@example.com` / `Prototype123!`.

## Developers

- Lance Crucis
- Katharine Batioco
- Redgie Blanco
- John Cruz