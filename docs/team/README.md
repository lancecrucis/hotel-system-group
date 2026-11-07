# Four-member workflow

Each member implements their feature across the frontend, backend, tests, and database. Keep matching feature names on both sides.

1. Work on a feature branch such as `feature/hotel-reservations`.
2. Keep feature-only components and API calls inside that frontend feature. Move code to shared folders only when another feature needs it.
3. Validate inputs at the route boundary. Keep reusable business/database operations in service/repository files. As endpoints grow, move their current router orchestration into the prepared controller/service directories without weakening transaction locks.
4. Existing route groups are `/api/auth`, `/api/hotel`, `/api/restaurant`, and `/api/reservations` plus the tracking module's operational endpoints. Maintain request/response shapes in `docs/api/README.md` when integrating changes.
5. Register feature routers in `backend/src/app.ts`. Coordinate edits to shared app files and package manifests.
6. Add new SQL changes under `database/migrations/` using the next numbered prefix, such as `003_hotel_housekeeping.sql`. Run `npm run db:migrate`; the runner validates checksums and records applied versions. Do not edit an already shared migration.
7. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:system`, `npm run test:e2e`, and `npm run build` before merging. Update the root lockfile when dependencies change.

Keep `node_modules/`, `.env`, `.local/`, build output, and real customer data out of Git. Every member follows [the setup guide](../SETUP.md): `npm ci`, `npm run doctor`, then `npm run dev`. Before starting a feature, create a branch from the latest `main`:

```powershell
git switch main
git pull origin main
git switch -c feature/my-task
```

Commit only your feature changes, push your branch, and open a pull request for the group to review. Do not commit generated local database files or passwords.
