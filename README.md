# Signal feedback board

A responsive feedback board with public idea submissions, community voting, live updates, and authenticated admin status management. Supabase provides shared cloud storage and authentication. Without cloud credentials, the app opens in a clearly labeled local preview that stores sample feedback, submissions, and votes in this browser.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set the Supabase project URL and publishable (anon) key. Leaving the placeholders lets you explore local preview mode.
4. Run `npm run dev` and open the URL Vite prints.

## Connect Supabase

1. Create a Supabase project. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to the project URL and publishable/anon key.
2. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase Authentication, create an email/password user for each workspace admin. Copy each user's UUID from the Authentication users list.
4. In the SQL Editor, register each admin: `insert into public.feedback_admins (user_id) values ('USER_UUID');`.
5. Restart the Vite server after changing `.env`.

The anon key is intended to be public in a browser app. Row-level security protects writes and admin-only status updates. Never add a Supabase service-role key to this project.

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
- Sign in as an admin and update idea statuses.
- Preview the board without a cloud project.
