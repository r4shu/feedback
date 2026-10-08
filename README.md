# Signal feedback board

A responsive public feedback board with idea submissions, community voting, and live updates. Supabase provides shared cloud storage. Without cloud credentials, the app opens in a clearly labeled local preview that stores sample feedback, submissions, and votes in this browser.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set the Supabase project URL and publishable (anon) key. Leaving the placeholders lets you explore local preview mode.
4. Run `npm run dev` and open the URL Vite prints.

## Connect Supabase

1. Create a Supabase project. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to the project URL and publishable/anon key.
2. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Restart the Vite server after changing `.env`.

The anon key is intended to be public in a browser app. Row-level security protects feedback writes. Never add a Supabase service-role key to this project.

## Deploy to Vercel

1. Import `r4shu/feedback` from GitHub in Vercel and keep the project root as `.`.
2. Vercel should detect Vite. Use `npm run build` as the build command and `dist` as the output directory.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings → Environment Variables. Use the same Supabase values as your local `.env`.
4. Deploy. The app remains in browser-only preview mode until Supabase is configured and the schema has been applied.

## Features

- Submit feature ideas, improvements, and bug reports.
- Search, filter by category, and sort by votes or recency.
- Toggle a vote per idea from the current browser.
- Receive feedback updates over Supabase Realtime.
- Browse the [GitHub repository](https://github.com/r4shu/feedback).
- Preview the board without a cloud project.
