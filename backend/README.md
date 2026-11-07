# Backend

Express/TypeScript API with a shared PostgreSQL pool, opaque hashed-token sessions, Zod validation, and feature modules.

- `account-management`: registration/login/profile, password hashing.
- `hotel-reservations`: room inventory/availability and hotel holds.
- `restaurant-reservations`: capacity intervals, hours, dining holds.
- `reservation-tracking`: state transitions, history, notifications, payments/refunds, dashboard, activity, roles.

Routers validate input and call shared transaction/repository functions. Repository files contain reusable inventory/status SQL. Small endpoint orchestration currently lives in the feature routers; the controllers/services folders are ready for further separation as the team expands the prototype. Use parameterized SQL, preserve transaction/lock boundaries, and keep all aggregate inventory writes in the API.

Local imports use `.js` extensions so compiled ESM runs in Node. Configuration comes from `backend/.env` or actual environment variables. See the root README and `docs/api/README.md` for commands/routes.
