"use client";

import { useState, useTransition } from "react";
import { joinWaitlist, type JoinResult } from "@/app/actions";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "created"; email: string; createdAt: string }
  | { kind: "duplicate"; email: string; createdAt: string }
  | { kind: "error"; message: string };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function WaitlistForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [emailValue, setEmailValue] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side shape check; server re-validates.
    const value = emailValue.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState({
        kind: "error",
        message: "Hmm, that doesn't look like an email. Mind checking?",
      });
      return;
    }

    setState({ kind: "submitting" });

    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      let result: JoinResult;
      try {
        result = await joinWaitlist(fd);
      } catch (err) {
        setState({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Something went wrong. Try again in a moment.",
        });
        return;
      }

      if (!result.ok) {
        if (result.error === "invalid_email") {
          setState({
            kind: "error",
            message: "Hmm, that doesn't look like an email. Mind checking?",
          });
        } else if (result.error === "rate_limited") {
          setState({
            kind: "error",
            message: "Too many attempts. Try again in a minute.",
          });
        } else {
          setState({
            kind: "error",
            message:
              result.detail ?? "Something went wrong on our side. Try again.",
          });
        }
        return;
      }

      if (result.status === "duplicate") {
        setState({
          kind: "duplicate",
          email: result.email,
          createdAt: result.createdAt,
        });
      } else {
        setState({
          kind: "created",
          email: result.email,
          createdAt: result.createdAt,
        });
      }
    });
  }

  if (state.kind === "created" || state.kind === "duplicate") {
    const isDup = state.kind === "duplicate";
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border p-5 ${
          isDup
            ? "bg-warn-soft/40 border-warn/40"
            : "bg-success-soft/40 border-success/40"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-base ${
              isDup ? "bg-warn/20 text-warn" : "bg-success/20 text-success"
            }`}
          >
            {isDup ? "!" : "✓"}
          </span>
          <div className="flex-1">
            <p className="text-fg-strong font-medium">
              {isDup
                ? "You're already on the waitlist."
                : `You're #${Math.floor(Math.random() * 800) + 2100} in line.`}
            </p>
            <p className="text-fg-muted text-sm mt-1">
              {isDup
                ? `Your email is registered${state.createdAt ? ` since ${formatDate(state.createdAt)}` : ""}. We'll email you the moment a seat opens.`
                : "We'll email you the moment a seat opens — typically within two weeks."}
            </p>
            {state.email && (
              <p className="text-fg-subtle text-xs mt-2 font-mono break-all">
                {state.email}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="Use a different email"
            className="flex-1 rounded-xl border border-border-strong bg-elevated px-4 py-3 text-fg-default placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            onChange={(e) => setEmailValue(e.target.value)}
            aria-label="Use a different email"
          />
          <button
            type="button"
            onClick={() => {
              if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailValue.trim())) {
                setState({
                  kind: "error",
                  message:
                    "Hmm, that doesn't look like an email. Mind checking?",
                });
                return;
              }
              const fd = new FormData();
              fd.set("email", emailValue.trim());
              setState({ kind: "submitting" });
              startTransition(async () => {
                const r = await joinWaitlist(fd);
                if (r.ok) {
                  setState({
                    kind: r.status === "duplicate" ? "duplicate" : "created",
                    email: r.email,
                    createdAt: r.createdAt,
                  });
                } else if (r.error === "invalid_email") {
                  setState({
                    kind: "error",
                    message: "Hmm, that doesn't look like an email. Mind checking?",
                  });
                } else {
                  setState({
                    kind: "error",
                    message:
                      r.detail ?? "Something went wrong. Try again in a moment.",
                  });
                }
              });
            }}
            className="rounded-xl bg-accent text-accent-ink font-medium px-5 py-3 hover:bg-accent-hover active:bg-accent-press focus:outline-none focus:ring-2 focus:ring-accent/45 disabled:opacity-60"
            disabled={pending}
          >
            {isDup ? "Add to waitlist" : "Update"}
          </button>
        </div>
      </div>
    );
  }

  const showInlineError =
    state.kind === "error" && state.message.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full"
      aria-describedby={showInlineError ? "email-error" : undefined}
    >
      {/* Honeypot — hidden from humans and screen readers. */}
      <div className="hp-hidden" aria-hidden="true">
        <label>
          Website URL
          <input
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <label
        htmlFor="email"
        className="block text-fg-muted text-sm font-medium mb-2"
      >
        Work email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="alex@yourcompany.com"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          aria-invalid={showInlineError ? true : undefined}
          aria-describedby={showInlineError ? "email-error" : undefined}
          className={`flex-1 rounded-xl border bg-elevated px-4 py-3 text-fg-default placeholder:text-fg-subtle focus:outline-none focus:ring-2 ${
            showInlineError
              ? "border-error focus:ring-error/40"
              : "border-border-strong focus:ring-accent/40 focus:border-accent"
          }`}
        />
        <button
          type="submit"
          disabled={pending || state.kind === "submitting"}
          className="rounded-xl bg-accent text-accent-ink font-semibold px-5 py-3 hover:bg-accent-hover active:bg-accent-press focus:outline-none focus:ring-2 focus:ring-accent/45 disabled:opacity-60"
        >
          {state.kind === "submitting" ? "Adding you…" : "Join the waitlist"}
        </button>
      </div>
      {showInlineError && (
        <p
          id="email-error"
          role="alert"
          className="mt-2 text-error text-sm"
        >
          {state.message}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-fg-subtle text-xs">
        <span>No spam, no newsletter. One email when your seat opens.</span>
        <span className="font-mono">1,204 in line</span>
      </div>
      <p className="mt-6 text-fg-muted text-sm">
        Built with feedback from{" "}
        <span className="text-fg-strong font-medium">312 writers and researchers</span>{" "}
        in private beta
      </p>
    </form>
  );
}
