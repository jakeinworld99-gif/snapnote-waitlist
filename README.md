# SnapNote — waitlist landing page

A single public Next.js page that captures an email, inserts it into a
Supabase `waitlist_signups` table, posts a notification to a Slack
channel, and shows the visitor a thank-you state.

## Stack

- Next.js 14 (App Router) on Vercel
- Tailwind CSS
- Supabase (Postgres + Row Level Security) for the waitlist table
- Slack incoming webhook for the notification
- TypeScript

## Run locally

```bash
# 1. install
npm install

# 2. set env (copy .env.example, fill real values, do not commit)
cp .env.example .env.local
$EDITOR .env.local

# 3. apply the Supabase migration (in the Supabase SQL editor or via psql)
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql

# 4. dev server
npm run dev          # http://localhost:3000

# 5. production build (verifies the bundle is clean)
npm run build && npm start
```

## Environment variables

Set these in `.env.local` for local dev and in the Vercel dashboard for
preview and production. Real values only live in those two places; the
repo never holds them. The Supabase values are written by
`/Users/namanpatel/.hermes-demo/scripts/supabase_project.py` the first
time a developer (or the squad's Prime agent) runs it; never paste a
key into chat or commit it.

| Name | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL. Safe to expose. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key. Not used by the page in this build, but kept in step with the project conventions. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Used by the server action to insert into `waitlist_signups`. Never prefix with `NEXT_PUBLIC_`, never commit. |
| `SLACK_WEBHOOK_URL` | server-only | Slack incoming webhook for the signup channel. Never prefix with `NEXT_PUBLIC_`, never commit. |
| `NEXT_PUBLIC_APP_URL` | public | The deployed URL. Used for context in the Slack message. |

## Supabase schema

`supabase/migrations/0001_init.sql` creates one table:

```sql
create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
```

A single RLS policy blocks `select` for the `anon` role. The server
action inserts with the service role, so no insert policy is needed for
the form to work, and the unique constraint on `email` produces a
friendly "already on the list" response on duplicates.

## Slack notification

On every successful new insert, the server action POSTs a one-line
message to the Slack incoming webhook:

```
New SnapNote waitlist signup: <email> at <iso timestamp>
```

A failure to post to Slack does not undo the insert; the response body
will carry `slack: { sent: false, error }` so the operator can see what
happened.

## Login credentials

There are none. This is a public landing page with a single email
field. No accounts, no sessions, no admin UI.

## Test cases

The four cases Vera runs on the preview URL after this build:

1. **Valid email, first time.** Submit `founder@example.com`. Expect a
   200-style response, a new row in `public.waitlist_signups`, and one
   Slack message with the email and a UTC timestamp. The UI shows the
   success state with the email and a "you're on the list" banner.
2. **Duplicate email.** Submit `founder@example.com` again. Expect no
   new row, no new Slack message, and the UI to render the
   "already on the list" banner with the original `created_at`.
3. **Invalid email shape.** Submit `not-an-email` (or leave the field
   empty, or submit `foo@bar`). The server action returns
   `{ ok: false, error: 'invalid_email' }`, no row is inserted, no
   Slack message is sent, and the UI shows the inline red error.
4. **Honeypot trip.** A request that fills the hidden `website_url`
   field short-circuits the server action and returns
   `{ ok: true, status: 'created' }` with no DB row and no Slack
   message. The UI shows the success state.

## Deploy

Push to the `main` branch of the GitHub repo; Vercel auto-deploys a
preview. After QA on the preview, Flux promotes to production.

Live preview: see the GitHub repo for the current URL.

## Files of note

- `app/page.tsx` — the landing page (server component).
- `components/WaitlistForm.tsx` — the email form (client component).
- `app/actions.ts` — the server action `joinWaitlist`.
- `lib/supabaseAdmin.ts` — server-only Supabase client (service role).
- `supabase/migrations/0001_init.sql` — schema and RLS policy.