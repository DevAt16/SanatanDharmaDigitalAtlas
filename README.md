# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Production Readiness Checklist

1. Install dependencies: `npm ci`
2. Configure analytics (optional):
   - Copy `.env.example` to `.env`
   - Set `VITE_GA_ID` with your GA4 measurement ID.
3. Validate quality gates:
   - `npm run lint`
   - `npm run check:duplicates`
   - `npm run build`
4. Preview production build locally: `npm run preview`

## Temple Addition Pipeline

To add temples with duplicate protection:

1. Prepare incoming temples in JSON (`[]` or `{ "temples": [] }`).
2. Run:

   - `npm run add:temples -- src/data/temples/<stateFile>.js <exportName> <inputJsonPath>`

Example:

- `npm run add:temples -- src/data/temples/madhyaPradesh.js madhyaPradeshTemples /tmp/new-mp-temples.json`

The script checks duplicates before insert and skips matches using:

- strict key: `name + state + city`
- loose key: normalized temple name + `state + city`

## Scalable Temple Store

Generate a normalized data store (`data-store/`) from the current JS datasets:

1. `npm run store:export`
2. Outputs:
   - `data-store/temples.ndjson`
   - `data-store/metadata.json`

Ingest additional temples into the store (with duplicate checks):

- Dry run:
  - `npm run store:ingest -- /tmp/new-temples.json --mode=shiva --dry-run`
- Write to store:
  - `npm run store:ingest -- /tmp/new-temples.json --mode=shiva --sourceType=wikipedia`

## Local Temple API

Serve paginated queries from the generated store:

1. Ensure store exists: `npm run store:export`
2. Start API: `npm run dev:api`
3. API endpoints:
   - `GET /health`
   - `GET /api/temples?mode=shiva&limit=25&offset=0`
   - `GET /api/stats?mode=shiva`
   - `GET /api/facets?mode=shiva`

## Frontend API Mode

The React app can pull temple records from the local API.

1. In `.env`:
   - `VITE_USE_TEMPLE_API=true`
   - `VITE_TEMPLE_API_BASE_URL=http://127.0.0.1:8787`
2. Start both:
   - Terminal 1: `npm run dev:api`
   - Terminal 2: `npm run dev`
