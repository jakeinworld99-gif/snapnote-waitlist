# SnapNote waitlist landing page

A single public Next.js page that captures a work email, inserts it into a
Supabase `waitlist_signups` table, posts a notification to a Slack incoming
webhook (best-effort, non-blocking), and renders one of four states back to
the visitor.

This repo holds the page, the form, the server action, and the Supabase
migration. The page is the deliverable; the table is shared infrastructure.

## Stack

- Next.js 14 (App Router, server actions) on Vercel
- Tailwind CSS, TypeScript
- Supabase (Postgres + Row Level Security) for the `waitlist_signups` table
- Slack incoming webhook for the signup notification

## Prerequisites

- Node.js 20.x or 22.x (the Vercel project pins Node 24.x; local dev runs on
  20+ without trouble)
- npm 10+
- A Supabase account (the squad's `agents` org; the project is created by
  `supabase_project.py` so you do not need to create it by hand)
- A Vercel account (the squad's `agents-fc55` team)
- A GitHub account with push access to `jakeinworld99-gif/snapnote-waitlist`
- Optional: a Slack incoming webhook URL if you want the signup notification

## Run locally

```bash
# 1. install deps
npm install

# 2. set env (copy .env.example, fill real values, do not commit)
cp .env.example .env.local
$EDITOR .env.local

# 3. apply the Supabase migration if you have not already
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql

# 4. dev server
npm run dev          # http://localhost:3000

# 5. production build (verifies the bundle is clean)
npm run build && npm start
```

## Environment variables

Real values live only in `.env.local` (local dev) and the Vercel project
settings (preview and production). The repo never holds them. The Supabase
values are written by `/Users/namanpatel/.hermes-demo/scripts/supabase_project.py`
the first time a developer (or the squad's Prime agent) runs it; never paste
a key into chat or commit it.

| Name | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public (browser-safe) | Supabase project URL. The page renders nothing that needs it directly, but it is kept in step with project conventions for any future client-side reads. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (browser-safe) | Supabase anon key. Same reason as above. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Used by the server action to insert into `waitlist_signups`. Never prefix with `NEXT_PUBLIC_`, never commit. |
| `SLACK_WEBHOOK_URL` | server-only (optional) | Slack incoming webhook for the signup channel. The server action POSTs one line per new insert. Never prefix with `NEXT_PUBLIC_`, never commit. Omit to disable notifications silently. |
| `NEXT_PUBLIC_APP_URL` | public | The deployed URL. Used for context in the Slack message. Defaults to `http://localhost:3000` in dev. |

A copy of the placeholders lives in `.env.example`; the real values are in
`.env.local` (git-ignored) and in the Vercel project's environment variables.

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

RLS is on, but the server action inserts with the service role, so no insert
policy is needed for the form to work. The unique constraint on `email`
produces Postgres error code `23505`, which `app/actions.ts` catches and
turns into a friendly "already on the list" response.

## Slack notification

On every successful new insert (not on duplicates), the server action POSTs a
one-line message to the Slack incoming webhook:

```
New SnapNote waitlist signup: <email> at <iso timestamp>
```

A failure to post to Slack does not undo the insert; the server action logs
`slack: { sent: false, error }` so the operator can see what happened.

## Login credentials

There are none. This is a public landing page with a single email field. No
sessions, no admin UI.

## Deploy

### Vercel preview (the one QA tests against)

From the project folder, with `VERCEL_TOKEN` set in env:

```bash
export HOME=/tmp/vc-home   # keeps the CLI's own login files out of your profile
V="npx -y vercel@latest --scope agents-fc55 --token $VERCEL_TOKEN"
$V link --yes --project snapnote-waitlist
$V deploy --yes            # prints the preview URL
```

`vercel link` will write `VERCEL_OIDC_TOKEN` into `.env.local`. Leave it
there; never copy it into Vercel and never commit it.

### Promote to production

After the preview passes QA:

```bash
$V deploy --prod --yes
```

The production alias is `snapnote-waitlist.vercel.app`. Preview URLs are
behind Vercel authentication (302 to strangers), so QA and review always
happen on the production deploy.

### Environment variables in Vercel

The required variables (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are set for both
`production` and `preview` targets via the Vercel project settings. The
service-role key never has a `NEXT_PUBLIC_` prefix.

## Files of note

- `app/page.tsx` — the landing page (server component, hero + features + form).
- `components/WaitlistForm.tsx` — the email form (client component, four states).
- `app/actions.ts` — the server action `joinWaitlist` and the `JoinResult` type.
- `lib/supabaseAdmin.ts` — server-only Supabase client (service role).
- `supabase/migrations/0001_init.sql` — schema and RLS policy.