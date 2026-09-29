/**
 * POST /api/waitlist — accept a waitlist email, validate server-side, and
 * insert into Supabase via the service-role admin client. Returns a
 * discriminated response the client form can render.
 *
 * Status mapping:
 *   200 { status: "new" }    — row inserted.
 *   200 { status: "exists" } — email already on the list (Postgres 23505).
 *   400 { status: "invalid" } — body missing, unparsable, or email shape is bad.
 *   500 { status: "error" }  — any other Supabase or server failure.
 *
 * The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY` (server env)
 * inside lib/supabaseAdmin. This Route Handler runs only on the server, so the
 * key never reaches the browser bundle.
 */
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX = 254;

type ApiResponse = {
  status: "new" | "exists" | "invalid" | "error";
  email?: string;
  createdAt?: string;
  message?: string;
};

function json(body: ApiResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Parse JSON body. Anything other than { email: string } is invalid.
  let rawEmail: unknown;
  try {
    const body = (await request.json()) as { email?: unknown };
    rawEmail = body?.email;
  } catch {
    return json({ status: "invalid" }, 400);
  }

  if (typeof rawEmail !== "string") {
    return json({ status: "invalid" }, 400);
  }

  const email = rawEmail.trim().toLowerCase();
  if (
    !email ||
    email.length > EMAIL_MAX ||
    !EMAIL_REGEX.test(email)
  ) {
    return json({ status: "invalid" }, 400);
  }

  // 2. Insert via the service-role admin client. The table has a unique
  //    constraint on email; a violation comes back with code 23505.
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("waitlist_signups")
    .insert({ email })
    .select("id, created_at")
    .single();

  if (error) {
    const isDuplicate =
      (error as { code?: string }).code === "23505" ||
      /duplicate key|already exists/i.test(error.message);
    if (isDuplicate) {
      // Surface the original created_at so the UI can show "since Mar 5".
      const { data: existing } = await supabase
        .from("waitlist_signups")
        .select("created_at")
        .eq("email", email)
        .single();
      const createdAt =
        existing?.created_at ?? new Date().toISOString();
      return json({ status: "exists", email, createdAt }, 200);
    }
    return json({ status: "error" }, 500);
  }

  const createdAt = data.created_at as string;
  return json({ status: "new", email, createdAt }, 200);
}
