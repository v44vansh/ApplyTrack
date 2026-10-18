# ApplyTrack

ApplyTrack is a calm, local-first job application command center. It turns a messy search into a focused pipeline with drag-and-drop stages, follow-up reminders, lightweight analytics, and a workspace that still works when the network does not.

## What is included

- Responsive dashboard with summary metrics, pipeline board, recent activity, and weekly focus.
- Drag-and-drop Kanban stages: Applied, Screening, Interview, Offer, and Closed.
- Search, stage filters, board/list views, edit/delete actions, notes, tags, job links, and next-action reminders.
- Analytics view with activity, pipeline health, and conversion snapshot charts.
- Light/dark themes and keyboard-friendly dialogs, controls, and visible focus states.
- IndexedDB persistence with localStorage fallback, BroadcastChannel cross-tab sync, and an offline service worker.
- Optional Fastify API with SQLite/Prisma persistence, secure cookie sessions, password hashing, protected routes, and Socket.IO change notifications.
- Deterministic seeded data so the first launch is useful without a backend or account.

Without `VITE_API_URL`, the frontend runs in local demo mode. With the API configured, it uses real registration/login, protected workspace data, server CRUD, sessions, and Socket.IO updates. Cross-tab updates use `BroadcastChannel` by default.

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

## Run locally

```bash
npm run dev
```

Open http://localhost:5173.

Run the API in a second terminal when using authenticated mode:

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
