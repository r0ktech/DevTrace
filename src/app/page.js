import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const stats = [
  { label: "repositories traced", value: "32" },
  { label: "commits synced", value: "1.4k" },
  { label: "PRs reviewed", value: "86" },
];

const features = [
  {
    icon: BarChart3,
    title: "Understand your work",
    text: "See how your coding time is distributed across projects, languages, and contribution patterns.",
  },
  {
    icon: GitBranch,
    title: "Track development flow",
    text: "Follow commit cadence, pull requests, issue activity, and the repositories that matter most.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded in GitHub data",
    text: "Your insight layer is built from actual project activity, not generic dashboards or fabricated metrics.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card)] font-mono text-sm font-semibold">
            D
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[-0.04em]">
              DevTrace
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-[var(--muted-foreground)] md:flex">
          <Link href="#product">Product</Link>
          <Link href="#features">Features</Link>
          <Link href="#demo">Demo</Link>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden rounded-md border border-[var(--card-border)] px-3 py-2 text-sm md:inline-flex">
            Explore demo
          </button>
          <Link
            href="/api/auth/signin/github"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]"
          >
            Connect GitHub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 pt-12 md:grid-cols-[1.15fr_0.85fr] md:items-center md:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <Sparkles className="h-3.5 w-3.5" />
            Developer analytics
          </div>

          <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.08em] text-[var(--foreground)] md:text-6xl">
            Understand how you build.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
            DevTrace turns your GitHub activity into a clear picture of what
            you&apos;re building, how you work, and where your time goes.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/api/auth/signin/github"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)]"
            >
              Connect GitHub
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 text-sm font-medium"
            >
              Explore demo
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-semibold tracking-[-0.06em]">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          id="demo"
          className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[0_10px_40px_-28px_var(--shadow)]"
        >
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Overview
                </div>
                <div className="mt-1 text-lg font-semibold">@r0ktech</div>
              </div>
              <div className="rounded-full border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]">
                90 days
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Contributions
                  </div>
                  <div className="mt-2 text-2xl font-semibold">189</div>
                </div>
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Commits
                  </div>
                  <div className="mt-2 text-2xl font-semibold">95</div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  <span>Activity</span>
                  <span>+24%</span>
                </div>
                <div className="flex h-28 items-end gap-1.5">
                  {[16, 22, 18, 28, 36, 30, 44, 41, 58, 52, 68, 76].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-sm bg-[var(--foreground)]/85"
                        style={{ height: `${height}%` }}
                      />
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {["devtrace", "platform", "analytics", "api"].map(
                  (repo, index) => (
                    <div
                      key={repo}
                      className="flex items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{repo}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {["JS", "TS", "Py", "Go"][index]}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="mb-8 max-w-xl">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Why DevTrace
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em]">
            Built for real engineering patterns.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--panel)]">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-medium tracking-[-0.04em]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-[var(--muted-foreground)]">
          <div>DevTrace</div>
          <div>Understand how you build.</div>
        </div>
      </footer>
    </main>
  );
}
