# TaskPilot waitlist — architecture

## Stack

| Concern | Choice | One-line reason |
|---|---|---|
| Framework | Next.js 15 App Router on Vercel | One repo, server actions for the insert, free Hobby tier gives a public URL. |
| Styling | Tailwind CSS | Brief names it. Utility classes keep the page lean and match the squad's other projects. |
| Database | Supabase Postgres | One dashboard for tables, free tier covers the demo, RLS enforces a deny-by-default posture even though the anon insert path needs to be allowed. |
| Auth | None | Public landing page, no accounts. |
| Notification | Slack incoming webhook | One secret, no OAuth dance, free, lands in a channel. |
| Deploy | Vercel Hobby, env vars set in the dashboard | Same flow as the squad's other projects. |

Pricing tiers were not re-verified live during this time-boxed sprint. The above choices are the same ones the brief already names. Flag as "Pricing not re-verified" before production deploy.

## Environment variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # not used by the page, but Supabase projects ship one
SUPABASE_SERVICE_ROLE_KEY=            # server-only, never exposed, used by the server action
SLACK_WEBHOOK_URL=                    # server-only, the incoming-webhook secret
NEXT_PUBLIC_APP_URL=                  # https://<project>.vercel.app, used in Slack text
```

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` and `SLACK_WEBHOOK_URL` are server-only. Never `NEXT_PUBLIC_`. Never committed.
- The Slack webhook URL is a secret. The page itself does not call Slack; the server action does. If the secret leaks, the Slack channel floods with garbage until the webhook is rotated.
- `NEXT_PUBLIC_APP_URL` is set so the Slack message can carry a link back to the page.

## Supabase schema

### `waitlist`

| column | type | notes |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| email | citext | required, validated server-side, lowercased before insert |
| source | text | optional, defaults to `landing`, the page name that submitted it |
| user_agent | text | optional, captured for spam triage |
| referrer | text | optional, captured from the `Referer` header |
| created_at | timestamptz | default `now()` |

No `updated_at`. Waitlist rows are append-only.

### RLS

Row Level Security is on for `waitlist`. Two policies:

- **Insert for anon.** The landing page is unauthenticated, so the anon role must be allowed to insert. Policy: `for insert to anon with check (email is_char_length(email) and length(email) between 5 and 254)`. A bare shape and length check at the policy layer is the first line of defence.
- **No select, no update, no delete for anyone from the client.** All reads happen through the service role in the server action's logging path (which we are not building in this sprint). The Supabase Studio is the only way to see the data.

The result: an anonymous visitor can submit the form and the server action will accept the insert. They cannot read or mutate other rows from the browser, and they cannot read their own row back.

### Why citext

`citext` stores the value case-insensitively and compares case-insensitively. "Founder@Example.com" and "founder@example.com" end up the same row's logical key, which is what we want for an email field without writing a `lower(email)` index by hand.

## Migrations file

`supabase/migrations/0001_init.sql` (Prime creates this):

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  source text not null default 'landing',
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists anon_insert on public.waitlist;
create policy anon_insert on public.waitlist
  for insert
  to anon
  with check (
    email is not null
    and length(email) between 5 and 254
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- Explicitly no select / update / delete policies for anon or authenticated.
-- Reads happen via the service role from the server runtime only.
```

## Seed data

None. The first row is a real signup from the public URL.

## Server action

`app/actions.ts`, exported as a server action `joinWaitlist(formData)`. Pseudo-shape:

```ts
'use server';

export async function joinWaitlist(formData: FormData) {
  // 1. Honeypot. If 'website_url' (the hidden field) is non-empty, return ok without doing anything.
  const honeypot = String(formData.get('website_url') ?? '');
  if (honeypot) return { ok: true, id: null };

  // 2. Parse + shape-validate email.
  const rawEmail = String(formData.get('email') ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail) || rawEmail.length > 254) {
    return { ok: false, error: 'invalid_email' };
  }
  const email = rawEmail.toLowerCase();

  // 3. Capture metadata from headers (server-only, passed in via the form action props or read on the server).
  const userAgent = String(formData.get('user_agent') ?? '');
  const referrer = String(formData.get('referrer') ?? '');

  // 4. Insert with the service role client (server-only).
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from('waitlist')
    .insert({ email, source: 'landing', user_agent: userAgent, referrer })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'db_error', detail: String(error.message) };

  // 5. Best-effort Slack ping. Failures do not undo the insert.
  const slack = await postSlackSignup(email, data.id);
  if (!slack.ok) {
    return { ok: true, id: data.id, slack: { sent: false, error: slack.error } };
  }

  return { ok: true, id: data.id, slack: { sent: true } };
}
```

Rate limiting (suggested, not strictly needed): a tiny in-memory `Map<ip, { count, windowStart }>` in the server action, capped at 5 submissions per IP per minute, returns `{ ok: false, error: 'rate_limited' }` over the cap. Cold starts on Vercel reset the map; that is acceptable for a demo. If we ever need durable limits, swap in `@vercel/kv` or Upstash.

## Slack notification shape

The webhook posts a single Block Kit message. Plain text below; Prime maps it to the `blocks` array on the server.

```
:envelope: New TaskPilot waitlist signup

Email:    founder@example.com
Row id:   <uuid>
Source:   landing
Referrer: https://www.google.com/
When:     2026-09-29 14:32:11 UTC

Open the row in Supabase: <https://supabase.com/dashboard/project/<ref>/editor>
```

Block Kit version (paste into Slack Block Kit Builder to preview):

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "New TaskPilot waitlist signup" } },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Email*\n`founder@example.com`" },
        { "type": "mrkdwn", "text": "*Row id*\n`00000000-0000-0000-0000-000000000000`" },
        { "type": "mrkdwn", "text": "*Source*\n`landing`" },
        { "type": "mrkdwn", "text": "*When*\n2026-09-29 14:32:11 UTC" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "Referrer: `https://www.google.com/`" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Open in Supabase" },
          "url": "https://supabase.com/dashboard/project/<ref>/editor",
          "action_id": "open_supabase"
        }
      ]
    }
  ]
}
```

The `POST` to the webhook URL is a single `fetch` with `Content-Type: application/json` and a 5-second timeout. Any non-2xx is treated as failure and logged on the server. We do not retry; a missed ping is visible on the dashboard the moment someone opens the table.

## Route map

```
/                              public landing, the form, the thank-you state
POST (server action) joinWaitlist    public, called from the form
```

No API routes, no auth middleware. The server action is the entire backend.

## Honeypot, metadata capture

The form includes a hidden `website_url` input styled off-screen (`position: absolute; left: -9999px`) with `tabindex="-1"` and `autocomplete="off"`. Real visitors leave it empty. Bots fill it. A filled honeypot short-circuits the action with `{ ok: true }` and does not insert.

`user_agent` and `referrer` are read on the server (from the request headers inside the server action) and stamped into hidden form fields so the action can read them from `formData`. Alternative: read them straight from `headers()` inside the server action and pass them into the insert. Either works; the headers-direct approach is one fewer hidden field.

## Things Prime needs to create

1. Supabase project. Run the migration `supabase/migrations/0001_init.sql`.
2. Slack workspace incoming webhook scoped to `#taskpilot-signups`. Capture the URL.
3. Vercel project, link to the GitHub repo, set the four env vars above. Never commit `.env.local`.
4. README in repo root with run steps, env vars, the Supabase project ref, the Slack channel name (never the webhook URL), and the live URL once Flux deploys.

## Open questions for Atlas

- Honeypot vs Cloudflare Turnstile: the brief said keep it simple. Honeypot it is. If the demo gets spam, Turnstile is the next step, and it slots into the server action without a schema change.
- Per-IP rate limit in-process or via Upstash: in-process for the demo. If we ever run two instances or scale to a region, the limit silently doubles. Out of scope until that matters.
- Email de-duplication: not in scope. A second insert with the same address produces a second row and a second Slack message. If we want one row per address, add a unique index on `email` and decide whether re-submits are blocked or upserted.
- Slack channel choice: the brief did not name one. The webhook target is whatever channel Atlas points the demo at. We assume `#taskpilot-signups`.
- Custom domain on Vercel: default `<project>.vercel.app` is fine.