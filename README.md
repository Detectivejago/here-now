# HereNow

HereNow is a mobile-first event discovery web app built with Next.js, Supabase, PostGIS and Leaflet. The first screen follows the provided visual reference: warm cream background, deep navy typography, soft coral action buttons, rounded map and compact city/category controls.

## Architecture

- Web app: Next.js App Router with React Server Components where useful and client components for the interactive map/forms.
- Database/Auth/Storage: Supabase PostgreSQL with PostGIS, Supabase Auth, Row Level Security and an `event-images` storage bucket.
- Map: Leaflet via React Leaflet, city bounds, approved event markers and viewport-friendly event limits.
- Deploy: Vercel, with Supabase environment variables.
- Analytics: privacy-friendly internal `analytics_events` table, with optional Vercel Analytics/PostHog/Plausible later.

Read the full architecture in [`docs/architecture.md`](docs/architecture.md).

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Create a Supabase project, run:

   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/seed.sql`](supabase/seed.sql)

4. Start the app:

   ```bash
   npm run dev
   ```

Without Supabase variables, the homepage still renders with local demo data so the UI can be reviewed immediately.

## Important docs

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/deploy-vercel.md`](docs/deploy-vercel.md)
- [`docs/github.md`](docs/github.md)
- [`docs/backup.md`](docs/backup.md)
- [`docs/test-checklist.md`](docs/test-checklist.md)
