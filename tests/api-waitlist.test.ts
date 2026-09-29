/**
 * Integration tests for the POST /api/waitlist Route Handler.
 *
 * Each test:
 *  1. Mocks the Supabase admin client to return a specific sequence.
 *  2. Builds a real Request and calls POST().
 *  3. Asserts the Response status, status code, and discriminated body.
 *
 * The route handler must satisfy:
 *   POST { email } -> 200 { status: "new" }   on successful insert
 *   POST { email } -> 200 { status: "exists" } on unique-constraint violation (23505)
 *   POST { email } -> 400 { status: "invalid" } on bad email shape
 *   POST { email } -> 500 { status: "error" } on any other Supabase error
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase admin client BEFORE importing the route handler so the
// module picks up the mocked implementation.
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    eq: mockEq,
  })),
};

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

import { POST } from "@/app/api/waitlist/route";

// Build a real Request for the handler. Node 22 has the Web Request API.
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

beforeEach(() => {
  // Reset every mock between tests.
  mockInsert.mockReset();
  mockSelect.mockReset();
  mockEq.mockReset();
  mockSingle.mockReset();
  mockSupabase.from.mockClear();
  // Default: .insert(...).select("...").single() returns no error.
  // Each test must arrange its own .insert(...) chain explicitly.
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/waitlist", () => {
  it("returns 200 status:'new' when the email is inserted successfully", async () => {
    // Arrange: insert -> select(...).single() returns the new row.
    const insertedAt = "2026-09-29T10:00:00.000Z";
    mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "row-1", created_at: insertedAt }, error: null }) }) });

    // Act
    const res = await POST(makeRequest({ email: "fresh@example.com" }));

    // Assert
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { status: string; email?: string; createdAt?: string };
    expect(body.status).toBe("new");
    expect(body.email).toBe("fresh@example.com");
    expect(body.createdAt).toBe(insertedAt);
    expect(mockInsert).toHaveBeenCalledWith({ email: "fresh@example.com" });
  });

  it("returns 200 status:'exists' when the email violates the unique constraint (Postgres 23505)", async () => {
    // Arrange: insert throws on .single with code 23505; a follow-up select
    // by email returns the existing row's created_at.
    const existingCreatedAt = "2026-09-28T10:00:00.000Z";
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint" },
          }),
      }),
    });
    // The duplicate lookup chain: .from(...).select(...).eq(...).single()
    mockSelect.mockReturnValue({ eq: () => ({ single: () => Promise.resolve({ data: { created_at: existingCreatedAt }, error: null }) }) });

    // Act
    const res = await POST(makeRequest({ email: "duplicate@example.com" }));

    // Assert
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { status: string; createdAt?: string };
    expect(body.status).toBe("exists");
    expect(body.email).toBe("duplicate@example.com");
    expect(body.createdAt).toBe(existingCreatedAt);
  });

  it("returns 400 status:'invalid' when the email fails shape validation", async () => {
    // Act
    const res = await POST(makeRequest({ email: "notanemail" }));

    // Assert
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { status: string };
    expect(body.status).toBe("invalid");
    // The handler must short-circuit before touching Supabase.
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 status:'error' when the Supabase insert fails with a non-duplicate error", async () => {
    // Arrange: insert errors out with something other than 23505.
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "42P01", message: "relation does not exist" },
          }),
      }),
    });

    // Act
    const res = await POST(makeRequest({ email: "boom@example.com" }));

    // Assert
    expect(res.status).toBe(500);
    const body = (await readJson(res)) as { status: string };
    expect(body.status).toBe("error");
    expect(mockInsert).toHaveBeenCalledWith({ email: "boom@example.com" });
  });

  it("returns 400 status:'invalid' when the email field is missing entirely", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { status: string };
    expect(body.status).toBe("invalid");
  });

  it("returns 400 status:'invalid' for an empty string email", async () => {
    const res = await POST(makeRequest({ email: "   " }));
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { status: string };
    expect(body.status).toBe("invalid");
  });

  it("returns 400 status:'invalid' when the request body is not JSON", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { status: string };
    expect(body.status).toBe("invalid");
  });

  it("normalizes the email to lowercase before insert and response", async () => {
    const insertedAt = "2026-09-29T10:00:00.000Z";
    mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: "row-1", created_at: insertedAt }, error: null }) }) });

    const res = await POST(makeRequest({ email: "  MixedCase@Example.COM  " }));

    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { status: string; email?: string };
    expect(body.status).toBe("new");
    expect(body.email).toBe("mixedcase@example.com");
    expect(mockInsert).toHaveBeenCalledWith({ email: "mixedcase@example.com" });
  });
});
