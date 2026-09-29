# TaskPilot waitlist — agents

What each squad member owns in this sprint and the handoff between them. One epic, one page, one table.

## Lens (research) — done in this ticket

- Picks the stack (Next.js + Tailwind + Supabase + Vercel + Slack incoming webhook). All four are fixed in the brief.
- Writes `product.md`, `architecture.md`, this file, and a Confluence research page titled "TaskPilot research" in space SD.
- Hands off to Muse: "scope is a single landing page with an email form. Stack, schema, server action and Slack message shape are in `architecture.md`. The 4-step flow and the demo copy are in `product.md`. Ready for design."

## Muse (design)

- Designs the single landing page: hero, one email field, one submit button, thank-you state. Mobile-first, desktop variant, dark/light per design system.
- Honours the route map in `architecture.md` (just one route, `/`). No new routes invented on the fly.
- Hands off to Prime with a Figma link (anyone-with-link can view) and a one-line note per state (default, submitting, error, thank-you).

## Prime (development)

- Builds the Next.js app against the approved design. One page, one server action, one Supabase client (service role, server-only).
- Creates the Supabase project, runs the migration `supabase/migrations/0001_init.sql`. Verifies the `anon_insert` policy is on and that the anon role cannot select.
- Captures the Slack incoming webhook URL for `#taskpilot-signups` and sets the four env vars in Vercel. Never commits `.env.local`.
- Pushes the GitHub repo, triggers the preview deploy.
- Hands off to Atlas with the preview URL, the repo link, the Supabase project ref, and what is missing.

## Vera (QA and security)

- Walks the 4-step flow on the preview URL using the acceptance criteria in `product.md`.
- Tests the RLS boundary: an `anon` Supabase key cannot `select` from `waitlist`. The service role can. The page never embeds the service role key in client-side JavaScript (search the built bundle).
- Tests the honeypot: a request that fills the hidden `website_url` field returns the thank-you state with no DB row and no Slack message.
- Tests Slack failure: temporarily bad `SLACK_WEBHOOK_URL` should produce a row in Supabase and a `slack: { sent: false, error: ... }` in the response body. The page still says thank-you. No console error, no thrown exception.
- Tests malformed input: an email without an `@` returns `{ ok: false, error: 'invalid_email' }`, no row, no Slack.
- Hands off to Atlas with a pass/fail per bullet and the evidence (Jira comment with screenshots, the response payloads).

## Flux (deployment)

- Promotes the preview to production on Vercel once Atlas approves the build.
- Re-checks every env var is set in the production environment (never inherited from preview).
- Verifies the production URL loads publicly, no login wall, the form submits end-to-end, the row appears in Supabase Studio, and the Slack message lands in `#taskpilot-signups`.
- Hands off to Atlas with the production URL and a one-line "deployed, smoke passed".

## Atlas (PM)

- Owns the epic, the gates, the change log.
- Approves research, design, build, and QA at each gate.
- Schedules the reminder cron while a gate is waiting on David.
- Sends David the final-deliverable review at the end.

## Nova (chief of staff)

- Notified by Atlas at the final-deliverable review.
- Sends David the one-message summary: live URL, repo, what works, the Slack channel, the Supabase project ref.

## David (founder, reviewer)

- Approves each gate when asked.
- Owns the production URL after handover.

## What is not in any agent's lap

- Auth, accounts, sessions, cookies, dashboards.
- Double-opt-in, confirmation emails, unsubscribe, de-dup.
- Analytics, A/B testing, segmentation, lead scoring.
- Internationalisation, multi-language copy.
- Anything beyond a single landing page. A second feature goes back to Atlas for a scope decision.