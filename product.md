# TaskPilot waitlist — product

## What this is

A single public landing page that captures an email address, drops it in a Supabase table, posts a notification to a Slack channel, and shows the visitor a "thanks, you're on the list" state. One page, one form, one server action. No auth, no dashboard, no admin area in this build.

It is a lead capture demo, not a product. The goal is to confirm the page renders publicly, the insert lands in Supabase, and the Slack ping lands in the channel, in under two minutes of setup.

## Who uses it

One role: **visitor**. No sign-up, no login. The visitor opens the page, types an email, clicks Join waitlist, sees a thank-you. Behind the scenes, a single Slack channel owner gets a one-line ping per signup.

## The 4-step flow

1. Visitor opens the public landing page at `/`.
2. Visitor types an email into the form and clicks "Join waitlist".
3. The Next.js server action validates the email, inserts one row into the Supabase `waitlist` table, then posts one message to Slack with the email and the timestamp. The Slack call is best-effort: if it fails, the insert still stands and the response surfaces the bug so the demo operator sees it.
4. The page swaps to a thank-you state with one line of copy: "You're on the list. We'll be in touch."

A second visit from the same email is allowed (no de-dup). The page is small enough that a re-submit is harmless; de-dup and unsubscribe are out of scope.

## Scope (in)

- Single Next.js page at `/` with hero copy, one email field, one submit button, thank-you state.
- Server action that validates email shape, inserts one row, calls Slack webhook.
- Supabase table `waitlist` with `id`, `email`, `created_at`, `source`, `user_agent`, `referrer`.
- Slack incoming webhook notification on every insert.
- Vercel deploy of the page, env vars set in the Vercel dashboard.
- Basic anti-spam: honeypot field and rate limit per IP (in-memory or via `@vercel/kv` if it is in the budget).

## Out of scope

- Authentication, accounts, sessions, cookies.
- Dashboard or admin UI. Reading the table is `select * from waitlist` in the Supabase UI.
- Double-opt-in, confirmation emails, unsubscribe links.
- Real-time analytics, A/B testing, segmentation.
- Payment, lead scoring, CRM export.
- Internationalisation, multi-language copy.
- Email validation beyond shape (`/^[^@\s]+@[^@\s]+\.[^@\s]+$/`). No MX lookup, no disposable-domain list.

## Acceptance for the demo

A first-time visitor loads the public URL on a fresh browser, submits `founder@example.com`, sees the thank-you state, and within ten seconds a message lands in the Slack channel with that email and the timestamp. The row is visible in Supabase Studio. A second submission of the same email returns the same thank-you state and produces a second Slack message and a second row, with no error.

## Demo copy (subject to Muse's design)

Hero: "TaskPilot — a calmer way to run your task list."
Subhead: "We're inviting a small first cohort. Drop your email to join the waitlist."
Button: "Join waitlist"
Thank-you: "You're on the list. We'll be in touch."
Footer line: "Built in public. One email, no spam."

## Notes for the team

- The Slack channel for the demo is `#taskpilot-signups`. The webhook URL is the only secret.
- The page does not need a database connection on the client. Supabase is touched only in the server action with the service role key. The anon key is fine to leave in the env (it is the public one), but nothing should ship it to the browser unless we add the Supabase JS client, which we are not doing here.