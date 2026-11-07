# Frontend

React + TypeScript + Vite with React Router and Lucide icons. Basic responsive UI focused on working forms and operational tables.

`src/features/` matches the four backend modules. Shared API requests, models, formatting, query hooks, UI components and layout live outside features. Authentication context controls navigation while the API independently enforces authorization. Protected routes distinguish signed-in users, staff, and administrators.

Vite proxies `/api` to Express. Production hosting needs SPA fallback and an equivalent same-origin API proxy. Property timezone and currency formatting are centralized in `src/utils/format.ts`.

See the root README for commands, demo accounts, workflows, and known prototype limits.
