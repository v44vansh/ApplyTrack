# ApplyTrack

ApplyTrack is a calm, local-first job application command center. It turns a messy search into a focused pipeline with drag-and-drop stages, follow-up reminders, lightweight analytics, and a workspace that still works when the network does not.

## What is included

- Responsive dashboard with summary metrics, pipeline board, recent activity, and weekly focus.
- Drag-and-drop Kanban stages: Applied, Screening, Interview, Offer, and Closed.
- Search, stage filters, board/list views, edit/delete actions, notes, tags, job links, and next-action reminders.
- Analytics view with activity, pipeline health, and conversion snapshot charts.
- Light/dark themes and keyboard-friendly dialogs, controls, and visible focus states.
- IndexedDB persistence with localStorage fallback, BroadcastChannel cross-tab sync, and an offline service worker.
- Deterministic seeded data so the first launch is useful without a backend or account.

The demo intentionally uses a local workspace rather than pretending a backend or authentication service exists. Cross-tab updates use `BroadcastChannel` by default. Set `VITE_SOCKET_URL` to an optional Socket.IO endpoint to publish/receive the same sync payload over WebSockets; the default local transport keeps the core flow fully offline.

## Requirements

- Node.js 20.18.0 (pinned in `.nvmrc`)
- npm 10+

## Setup

```bash
npm ci
```

## Run locally

```bash
npm run dev
```

Open http://localhost:5173.

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

## Production preview

```bash
npm run build
npm run preview
```

The production bundle is written to `dist/` and is deployable as a static site. For a reproducible container preview:

```bash
docker run --rm -p 4173:4173 applytrack
```

Open http://localhost:4173.

## Project notes

- `src/store/useAppStore.ts` contains optimistic local mutations.
- `src/lib/storage.ts` contains IndexedDB persistence and the cross-tab transport.
- `public/sw.js` caches the app shell after the first visit.
- Seed records and dates live in `src/data/seed.ts` so screenshots and automated checks are stable.
