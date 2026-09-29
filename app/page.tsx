import WaitlistForm from "@/components/WaitlistForm";

type Feature = {
  title: string;
  body: string;
  tag: string;
  icon: React.ReactNode;
};

const features: Feature[] = [
  {
    title: "Capture a thought before it's gone",
    body: "Hit one shortcut, type a sentence, done. SnapNote lives in your menu bar so it opens before the thought leaves your head.",
    tag: "Under 3 seconds",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
      >
        <path
          d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Markdown that stays out of your way",
    body: "Plain text you can read a year from now. No rich-text editor, no formatting toolbar, no HTML in your notes — just your words.",
    tag: "Plain text forever",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
      >
        <path
          d="M5 4h14v16H5z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Search across every note you've ever written",
    body: "Find that half-remembered idea from last March in 200ms. Full-text search, keyboard-first, no folders to maintain.",
    tag: "200ms search",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
      >
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M16.2 16.2L20 20"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base text-fg-default">
      <header className="border-b border-border-subtle/60">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-fg-strong font-semibold tracking-tight">
              SnapNote
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-fg-muted text-sm">
            <a href="#features" className="hover:text-fg-default">
              Features
            </a>
            <a href="#privacy" className="hover:text-fg-default">
              Privacy
            </a>
            <a
              href="https://github.com/jakeinworld99-gif/snapnote-waitlist"
              className="hover:text-fg-default"
              rel="noreferrer"
            >
              Status
            </a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Closed beta · Q1 2027
          </span>
          <h1 className="mt-6 text-[34px] sm:text-[44px] lg:text-[56px] leading-[1.05] font-semibold text-fg-strong tracking-tight">
            The note app that opens{" "}
            <span className="gradient-phrase">before the thought is gone</span>.
          </h1>
          <p className="mt-5 max-w-xl text-fg-muted text-lg leading-relaxed">
            SnapNote is a tiny markdown scratchpad for macOS that lives in your
            menu bar. Join the waitlist, we'll let you in as soon as a seat
            opens.
          </p>

          <div className="mt-10 max-w-xl rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6 shadow-card">
            <WaitlistForm />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-card">
            <p className="text-fg-subtle text-xs uppercase tracking-wider font-mono">
              Last 24 hours in SnapNote
            </p>
            <ul className="mt-4 space-y-3">
              {[
                {
                  tag: "07:14",
                  title: "pricing: $5/mo, $40/yr, free tier 100 notes",
                  meta: "today",
                  tone: "accent",
                },
                {
                  tag: "07:42",
                  title: "ship menu-bar polish, fix cmd-, shortcut",
                  meta: "today",
                  tone: "warn",
                },
                {
                  tag: "Yesterday",
                  title: "ask lin re: cloud sync opt-in vs implicit",
                  meta: "to self",
                  tone: "fg",
                },
                {
                  tag: "Friday",
                  title: "v0.4 — full-text search across 12k notes",
                  meta: "shipped",
                  tone: "success",
                },
              ].map((row) => (
                <li
                  key={row.title}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border-subtle/60 bg-elevated px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 items-center rounded-md px-2 text-xs font-medium ${
                        row.tone === "warn"
                          ? "bg-warn-soft text-warn"
                          : row.tone === "success"
                            ? "bg-success-soft text-success"
                            : row.tone === "accent"
                              ? "bg-accent/15 text-accent"
                              : "bg-border-subtle text-fg-muted"
                      }`}
                    >
                      {row.tag}
                    </span>
                    <p className="text-fg-default text-sm leading-snug">
                      {row.title}
                    </p>
                  </div>
                  <span className="text-fg-subtle text-xs whitespace-nowrap font-mono">
                    {row.meta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32"
      >
        <h2 className="text-[28px] sm:text-[32px] font-semibold text-fg-strong tracking-tight">
          Three things that change when notes open instantly.
        </h2>
        <p className="mt-3 text-fg-muted max-w-2xl">
          SnapNote is small on purpose: one shortcut, one text field, one search
          bar. Nothing more.
        </p>
        <div className="mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {f.icon}
                </span>
                <span className="rounded-full bg-elevated px-3 py-1 text-xs text-fg-muted border border-border-subtle">
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-fg-strong">
                {f.title}
              </h3>
              <p className="mt-3 text-fg-muted leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer
        id="privacy"
        className="border-t border-border-subtle/60"
      >
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-fg-subtle text-sm">
          <p>© 2026 SnapNote · Built by one person in Bangalore</p>
          <nav className="flex items-center gap-5">
            <a href="#privacy" className="hover:text-fg-default">
              Privacy
            </a>
            <a href="#privacy" className="hover:text-fg-default">
              Terms
            </a>
            <a
              href="mailto:hello@snapnote.example"
              className="hover:text-fg-default"
            >
              Contact
            </a>
            <a
              href="https://github.com/jakeinworld99-gif/snapnote-waitlist"
              className="hover:text-fg-default"
              rel="noreferrer"
            >
              Status
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}