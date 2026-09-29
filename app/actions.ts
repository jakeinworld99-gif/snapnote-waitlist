"use server";

import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX = 254;
const SLACK_TIMEOUT_MS = 5_000;

export type JoinResult =
  | { ok: true; status: "created"; email: string; createdAt: string }
  | { ok: true; status: "duplicate"; email: string; createdAt: string }
  | { ok: false; error: "invalid_email" | "rate_limited" | "db_error"; detail?: string };

// Naive in-memory rate limit: at most 5 submissions per IP per minute.
// Cold starts reset the map. That is acceptable for a demo.
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= 5) return false;
  b.count += 1;
  return true;
}

async function postSlackNotification(
  email: string,
  createdAt: string,
): Promise<{ sent: boolean; error?: string }> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return { sent: false, error: "SLACK_WEBHOOK_URL not configured" };
  }

  const isoTimestamp = new Date(createdAt).toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New SnapNote waitlist signup: ${email} at ${isoTimestamp}`,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { sent: false, error: `slack ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function clientIp(): string {
  // x-forwarded-for is the Vercel standard; fall back to a fixed bucket so
  // local dev still works without one.
  try {
    const h = headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real;
  } catch {
    // headers() throws when called outside a request scope (e.g. tests).
  }
  return "local";
}

export async function joinWaitlist(formData: FormData): Promise<JoinResult> {
  // 1. Honeypot. Real visitors leave it empty; bots fill it. Short-circuit ok.
  const honeypot = String(formData.get("website_url") ?? "").trim();
  if (honeypot) {
    return {
      ok: true,
      status: "created",
      email: "",
      createdAt: new Date().toISOString(),
    };
  }

  // 2. Per-IP rate limit.
  const ip = clientIp();
  if (!rateLimit(ip)) {
    return { ok: false, error: "rate_limited" };
  }

  // 3. Parse and shape-validate the email. Server-side, do not trust the browser.
  const rawEmail = String(formData.get("email") ?? "").trim();
  if (
    !rawEmail ||
    rawEmail.length > EMAIL_MAX ||
    !EMAIL_REGEX.test(rawEmail)
  ) {
    return { ok: false, error: "invalid_email" };
  }
  const email = rawEmail.toLowerCase();

  // 4. Insert with the service role. Treat a unique violation as a friendly
  //    duplicate response instead of an error.
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("waitlist_signups")
    .insert({ email })
    .select("id, created_at")
    .single();

  if (error) {
    // Postgres unique violation ships as code 23505 in the Supabase client.
    const isDuplicate =
      (error as { code?: string }).code === "23505" ||
      /duplicate key|already exists/i.test(error.message);
    if (isDuplicate) {
      // Look up the existing row so we can surface the original created_at.
      const { data: existing } = await supabase
        .from("waitlist_signups")
        .select("created_at")
        .eq("email", email)
        .single();
      const createdAt =
        existing?.created_at ?? new Date().toISOString();
      return { ok: true, status: "duplicate", email, createdAt };
    }
    return { ok: false, error: "db_error", detail: error.message };
  }

  const createdAt = data.created_at as string;

  // 5. Slack notification on every NEW insert only (not on duplicates).
  //    Failure here does not undo the insert.
  await postSlackNotification(email, createdAt);

  return { ok: true, status: "created", email, createdAt };
}