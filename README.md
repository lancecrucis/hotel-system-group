# Hotel and Restaurant Reservation with Tracking System

A functional prototype based on the supplied ERD. React + TypeScript + Vite, Node.js + Express + TypeScript, and real PostgreSQL persistence. Simple responsive screens for guests, reception staff, and administrators.

## Run the system

Requires Git, Node.js 22.12+, npm 10+, and PostgreSQL server binaries. Windows installations under `C:\Program Files\PostgreSQL\<version>\bin` are detected automatically; on other systems add `initdb` and `pg_ctl` to PATH.

```powershell
git clone https://github.com/lancecrucis/hotel-system-group.git
cd hotel-system-group
npm ci
npm run doctor
npm run dev
```

Open **http://localhost:5173**. The startup command creates a private `.env` if missing, starts the project-local database, applies pending migrations, seeds demo data without overwriting existing records, and runs both applications. Run it from the project root. In PowerShell use `npm.cmd` if `npm.ps1` is blocked.

| Demo account    | Email             | Password      |
| --------------- | ----------------- | ------------- |
| Customer        | guest@example.com | Prototype123! |
| Reception staff | staff@example.com | Prototype123! |
| Administrator   | admin@example.com | Prototype123! |

Demo credentials are shown on the sign-in page. Use only with local demonstration data. Demo seeding is disabled when `NODE_ENV=production`.

## What works

- Registration, login/logout, optional 30-day remembered sessions, local-development password reset, editable profiles, password hashing, HTTP-only sessions, role checks, and administrator role assignment.
- Room availability by dates and party size; nightly pricing; room descriptions, amenities, cover/gallery image URLs; staff room creation/editing and maintenance controls.
- Restaurant availability by date, time, and party size; automatically assigned tables; one-hour visits with a 30-minute table buffer and 30-minute start intervals.
- Temporary booking holds, confirmation, cancellation with a reason, unique booking references, and a chronological status timeline.
- Hotel check-in/check-out; restaurant arrival, seating, completion; no-show handling.
- Staff-recorded payments, partial/full refunds, receipt references, outstanding balances, and overpayment/over-refund protection.
- In-app notifications, read state, staff activity logs, a daily operations dashboard, search/filtering, and printable booking details.
- Real database transactions serialize bookings for the same room or restaurant capacity, including simultaneous requests.

## Try a complete workflow

1. Sign in as a customer, choose **Book a room**, search dates, select a room, and continue to the confirmation page.
2. Click **Confirm booking** within 15 minutes. The reservation and timeline appear under **My reservations**.
3. Sign out and sign in as staff. Open the booking under **All reservations**.
4. On its arrival date, **Check in**, **Record payment**, then **Check out**. Checkout requires the total room balance to be settled.
5. For dining, choose a time and confirm. On the visit date, staff progress it through **Mark arrived → Seat guests → Complete visit**.
6. To demonstrate refunds, record a hotel payment, cancel before arrival or finish the stay, then record a refund against the original payment. This records an external refund; it does not transfer money.

## Prototype rules and limits

- Prices are demonstration USD amounts. Change display currency in `frontend/src/utils/format.ts` before entering real prices. Property dates/times use **Asia/Taipei**, configured in the PostgreSQL pool and frontend formatting utility.
- Hotel stays last 1–30 nights; checkout is exclusive, so consecutive stays can share a checkout/check-in date. A room with a guest still checked in cannot receive another check-in.
- Check-in is advertised from 3 PM and checkout by 11 AM. Staff may process arrivals on the reservation date; no-shows cannot be marked before the scheduled arrival time.
- A pending reservation holds inventory for 15 minutes. Confirmation secures it without an online payment. Expiry runs every minute and before key reads/writes. Terminal states cannot be reactivated.
- Restaurant inventory includes individual tables with 2, 4, or 6 seats. The system assigns the smallest available table that fits the party. It holds that table for the one-hour visit plus a 30-minute buffer, and also checks overall seat capacity. The prototype has no visual floor plan.
- Customers can confirm and cancel before service starts. Date/room/party changes use cancellation and a new booking in this prototype. Contact the property for past-booking changes. No cancellation fees are calculated automatically.
- Payments and refunds are staff records of cash, transfers, or external card-terminal transactions. There is no online payment gateway, card storage, automatic collection, or automatic refund. Dining bills are outside the reservation model.
- Notifications are in-app only. Password reset links appear on screen in local development and expire after 15 minutes; production password recovery requires an email service before it can be enabled. Room images use URLs rather than uploads.
- Lists show at most 500 reservations/users and 200 notifications/activity events. There is no external hotel-channel integration, multi-property support, or housekeeping module.

## Database and privacy

The development database is `hotel_restaurant_dev` at `127.0.0.1:5433`. Its credentials live in `backend/.env`, and its PostgreSQL cluster files live in `.local/postgres/`. Both are ignored by Git. It is separate from the installed Windows PostgreSQL service. Do not manually edit or delete cluster files.

Ctrl+C stops the app servers. To stop PostgreSQL separately:

```powershell
npm run db:stop
```

Schema migrations are versioned and checksum-checked. Add a new SQL migration rather than changing one already applied. Seeding is idempotent and preserves changes to existing accounts, rooms, settings, and demo bookings. The two seeded bookings use dates relative to their first creation, so they will eventually become historical.

## Commands

| Command                                        | Purpose                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                                  | Set up database/schema/demo records and run frontend + backend     |
| `npm run dev:frontend` / `npm run dev:backend` | Run one application                                                |
| `npm run setup`                                | Create missing local environment configuration                     |
| `npm run doctor`                               | Check Node.js, npm, and PostgreSQL prerequisites                   |
| `npm run db:start` / `npm run db:stop`         | Start/stop the project PostgreSQL cluster                          |
| `npm run db:migrate`                           | Apply new migrations                                               |
| `npm run db:seed`                              | Add missing demo data                                              |
| `npm run db:check`                             | Verify the database connection                                     |
| `npm run typecheck`                            | Check both apps and backend test types                             |
| `npm run lint`                                 | Lint both apps                                                     |
| `npm run build`                                | Build both apps                                                    |
| `npm test`                                     | Run HTTP health/readiness tests                                    |
| `npm run test:system`                          | Exercise real PostgreSQL booking workflows and concurrent requests |
| `npm run test:e2e`                             | Run the Chromium UI workflow and responsive-layout test            |
| `npm run format`                               | Format project source and documentation                            |

For browser testing on a new machine, first run `npx playwright install chromium`. The system integration test requires a started, migrated, seeded database. It creates unique test users/rooms/bookings and deletes its own records afterward. Browser tests do the same and save overview/mobile screenshots in `docs/screenshots/`.

## Four-member ownership

| Member | Matching frontend feature / backend module | Responsibility                                                               |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------- |
| 1      | `account-management`                       | Accounts, sessions, profiles, roles                                          |
| 2      | `hotel-reservations`                       | Rooms, inventory, hotel bookings                                             |
| 3      | `restaurant-reservations`                  | Dining availability, capacity, settings, bookings                            |
| 4      | `reservation-tracking`                     | Status workflow, history, payments, refunds, notifications, dashboard, audit |

Common configuration, HTTP/database helpers, shared UI, and frontend API types are outside the feature modules. Coordinate changes to those files and migrations. Future-work directories retain `.gitkeep` markers.

Read [setup details](docs/SETUP.md), [ERD mapping](docs/database/ERD.md), [API reference](docs/api/README.md), [workflow research](docs/architecture/WORKFLOWS.md), and [team conventions](docs/team/README.md).

## Deployment

`npm run build` creates `frontend/dist/` and `backend/dist/`. Run the API with `npm start --workspace backend`. Serve the frontend with SPA fallback and proxy `/api` to Express on the same origin. Set `NODE_ENV=production`, real PostgreSQL credentials and `CLIENT_ORIGIN`; use HTTPS for secure session cookies. Apply migrations separately with the development tooling available.

The local cluster helper and publicly documented demo accounts are for local demonstrations. A deployed system needs restricted database roles, managed backups, operational monitoring, real business policies, and delivery/payment integrations as applicable.
