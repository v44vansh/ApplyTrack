# ApplyTrack

ApplyTrack is a calm, local-first job application command center. It turns a messy search into a focused pipeline with drag-and-drop stages, follow-up reminders, lightweight analytics, and a workspace that still works when the network does not.

## What is included

- Responsive dashboard with summary metrics, pipeline board, recent activity, and weekly focus.
- Drag-and-drop Kanban stages: Applied, Screening, Interview, Offer, and Closed.
- Search, stage filters, board/list views, edit/delete actions, notes, tags, job links, and next-action reminders.
- Analytics view with activity, pipeline health, and conversion snapshot charts.
- Light/dark themes and keyboard-friendly dialogs, controls, and visible focus states.
- IndexedDB persistence with localStorage fallback, BroadcastChannel cross-tab sync, and an offline service worker.
- Supabase production mode with email/password auth, PostgreSQL, Row Level Security, and realtime subscriptions.
- Optional Fastify API with SQLite/Prisma persistence for self-hosted/local deployments.
- Deterministic seeded data so the first launch is useful without a backend or account.

Without Supabase or `VITE_API_URL`, the frontend runs in local demo mode. With Supabase variables, it uses real registration/login, PostgreSQL CRUD, RLS-protected workspace data, and Supabase Realtime. Cross-tab updates use `BroadcastChannel` in local mode.

## Requirements

- Node.js 20.18.0 (pinned in `.nvmrc`)
- npm 10+

## Setup

```bash
npm ci
```

For authenticated API mode, create a local `.env` from `.env.example`, then initialize the database:

```bash
npm run db:generate
npm run db:push
```

For Supabase mode, add these variables to `.env` instead:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Then run the SQL in [`supabase/schema.sql`](supabase/schema.sql) once in **Supabase → SQL Editor**. The schema creates the tables, indexes, activity triggers, RLS policies, and Realtime publication entries.

## Run locally

```bash
npm run dev
```

Open http://localhost:5173.

Run the API in a second terminal when using Fastify authenticated mode:

```bash
npm run server:start
```

The API listens on http://localhost:4000.

## Checks

The single reproducible check command is:

```bash
npm run check
```

It runs:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

On Linux/macOS, `make test` runs the same checks through the included `Makefile`.

The Playwright smoke suite can be run separately when the local browser is installed:

```bash
npx playwright install chromium
npm run test:e2e
```

The authenticated API smoke test starts both services and verifies registration, protected workspace access, server-backed application creation, and reload persistence:

```bash
npm run test:e2e:api
```

## Deploy the frontend to GitHub Pages

GitHub Pages can host the React frontend, but it cannot run a server. For the zero-cost multi-user production setup, use GitHub Pages plus Supabase. The existing Fastify API remains available for self-hosted deployments but is not needed when Supabase variables are present.

### 1. Push this repository to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin master
```

If your default branch is `main`, push `main` instead. The included `.github/workflows/deploy-pages.yml` runs on either branch.

### 2. Enable GitHub Pages

In the GitHub repository:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` or `master`, then open the **Actions** tab and wait for **Deploy ApplyTrack to GitHub Pages** to finish.

For a repository named `applytrack`, the URL will be:

```text
https://YOUR_USERNAME.github.io/applytrack/
```

The Vite configuration automatically uses the repository sub-path during the Pages build. Do not set the Pages source to “Deploy from a branch”; use GitHub Actions so the Vite base path is correct.

### 3. Configure Supabase

1. Create a free Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable Email.
4. In **Authentication → URL Configuration**, set the Site URL to:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

5. Add both the app URL and its verification route as allowed redirect URLs:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/verify-email
```

   ApplyTrack sends confirmation links to `/verify-email`; the deployed build includes a GitHub Pages SPA fallback so that route opens the app instead of a 404.

The browser uses only the Supabase URL and public anon key. RLS policies ensure each signed-in user can access only their own applications and activities.

### 4. Connect Pages to Supabase

In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Do not add `service_role`, database passwords, or other private credentials to `VITE_*` variables. Trigger **Deploy ApplyTrack to GitHub Pages** again after adding them. The workflow passes these variables into the Vite build.

After deployment, register two accounts in separate browsers and verify that each account has an isolated workspace. Open the same account in two tabs to verify Realtime updates.

### Optional: deploy the Fastify API separately

The API needs a persistent filesystem because the current reproducible backend uses SQLite. On Render, for example:

```text
Build command: npm ci && npm run db:generate && npm run build
Start command: npm run db:push && npm run server:start
```

Attach a persistent disk mounted at `/var/data`, then set:

```env
DATABASE_URL=file:/var/data/applytrack.db
NODE_ENV=production
FRONTEND_URL=https://YOUR_USERNAME.github.io
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
```

`FRONTEND_URL` is the origin only; do not add `/applytrack/` to it. The API URL itself will look like `https://applytrack-api.onrender.com`.

For higher scale, migrate the Prisma datasource from SQLite to PostgreSQL and use a managed Postgres database before deploying multiple API instances.

### Optional API variables

In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add:

```text
VITE_API_URL=https://YOUR_API_HOST.example.com
VITE_SOCKET_URL=https://YOUR_API_HOST.example.com
```

These are public browser URLs, so repository **Variables** are appropriate. Do not put database URLs, session secrets, or private credentials in `VITE_*` variables. Trigger the workflow again after adding them.

If you omit Supabase variables and API variables, the Pages site works as a local-first static demo only.

## Production preview

```bash
npm run build
npm run preview
```

The production bundle is written to `dist/`. The container runs the Fastify API and serves the built frontend from the same origin:

```bash
docker build -t applytrack .
docker run --rm -p 4000:4000 applytrack
```

Open http://localhost:4000.

## Project notes

- `src/store/useAppStore.ts` contains optimistic local mutations.
- `src/lib/storage.ts` contains IndexedDB persistence and the cross-tab transport.
- `src/lib/realtime.ts` listens for local and authenticated Socket.IO changes.
- `public/sw.js` caches the app shell after the first visit.
- Seed records and dates live in `src/data/seed.ts` so screenshots and automated checks are stable.
- `server/app.ts` contains auth, protected CRUD routes, validation, and activity transactions.
- `prisma/schema.prisma` defines users, sessions, applications, and activity history.
