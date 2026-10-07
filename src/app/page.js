import Link from "next/link";
import { Activity, FolderGit2, Lightbulb } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { demoEnabled } from "@/server/auth/demo";
import { generateDemoData } from "@/server/demo/seed";
import { addDaysKey, bucketKeys, dateToKey, fillSeries, startOfWeekKey } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConnectGitHubButton } from "@/components/app/connect-github-button";
import { Heatmap } from "@/components/charts/heatmap";
import { ActivityChart } from "@/components/charts/activity-chart";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Activity,
    title: "Activity you can read",
    body: "A contribution calendar, activity over time, streaks, and the hours you actually commit, in your own timezone.",
  },
  {
    icon: FolderGit2,
    title: "Where your time goes",
    body: "Repositories ranked by your commits, pull requests and issues, with language usage explained rather than just charted.",
  },
  {
    icon: Lightbulb,
    title: "Insights with the numbers shown",
    body: "Observations like “activity up 24% on the previous 30 days”, each with its evidence. No pattern is claimed without enough data.",
  },
];

/** Aggregate the sample generator's output for the preview (no database). */
function buildPreview(now) {
  const data = generateDemoData(now);
  const todayKey = dateToKey(now);
  const heatStart = addDaysKey(startOfWeekKey(todayKey), -25 * 7);
  const days = fillSeries(
    bucketKeys(heatStart, todayKey),
    data.contributions.map((d) => ({ key: dateToKey(d.date), count: d.count })),
  );
  const start30 = addDaysKey(todayKey, -29);
  const keys = bucketKeys(start30, todayKey);
  const count = (items, field) => {
    const rows = items.map((i) => ({ key: dateToKey(i[field]), count: 1 })).filter((r) => r.key >= start30);
    return fillSeries(keys, rows);
  };
  const c = count(data.commits, "committedAt");
  const p = count(data.pullRequests, "openedAt");
  const i = count(data.issues, "openedAt");
  const points = keys.map((key, n) => ({ key, commits: c[n].value, pullRequests: p[n].value, issues: i[n].value }));
  const totals = points.reduce(
    (t, pt) => ({ commits: t.commits + pt.commits, pullRequests: t.pullRequests + pt.pullRequests, issues: t.issues + pt.issues }),
    { commits: 0, pullRequests: 0, issues: 0 },
  );
  return { days, points, totals };
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const showDemo = demoEnabled();
  const preview = buildPreview(new Date());

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Primary">
          {user ? (
            <Button asChild variant="primary" size="md">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              {showDemo && (
                <form action="/api/demo" method="post" className="hidden sm:block">
                  <Button type="submit" variant="ghost" size="md">Explore demo</Button>
                </form>
              )}
              <ConnectGitHubButton size="md" label="Sign in" variant="secondary" />
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Understand how you build.</h1>
            <p className="mt-4 text-base leading-relaxed text-fg-2 sm:text-lg">
              DevTrace turns your GitHub activity into a clear picture of what you&apos;re building, how you work, and where your time goes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {user ? (
                <Button asChild variant="primary" size="lg">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              ) : (
                <ConnectGitHubButton />
              )}
              {showDemo && !user && (
                <form action="/api/demo" method="post">
                  <Button type="submit" variant="secondary" size="lg">Explore demo</Button>
                </form>
              )}
            </div>
            <p className="mt-4 text-xs text-fg-3">
              Read-only analysis of your repositories, commits, pull requests and issues. Your GitHub token is encrypted and never sent to the browser.
            </p>
          </div>
        </section>

        <section aria-label="Product preview" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-lg border border-border-strong bg-bg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-fg-3">
                <LogoMark className="h-4 w-4" />
                Overview
              </div>
              <span className="rounded-[4px] border border-warning/50 px-1.5 py-0.5 text-2xs font-medium text-warning">Sample data</span>
            </div>
            <div className="grid gap-px bg-border lg:grid-cols-[1fr_1.1fr]">
              <div className="bg-surface p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">Contribution activity</p>
                <Heatmap days={preview.days} noun="contribution" />
              </div>
              <div className="bg-surface p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">Activity over time · 30 days</p>
                <ActivityChart points={preview.points} unit="day" totals={preview.totals} height={180} />
              </div>
            </div>
            <dl className="grid grid-cols-3 border-t border-border bg-surface text-sm">
              {[
                ["Commits", preview.totals.commits],
                ["Pull requests", preview.totals.pullRequests],
                ["Issues", preview.totals.issues],
              ].map(([label, value]) => (
                <div key={label} className="border-r border-border px-4 py-3 last:border-r-0">
                  <dt className="text-xs text-fg-3">{label}</dt>
                  <dd className="mt-1 text-xl font-medium tabular">{formatNumber(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-2 text-xs text-fg-3">Preview generated from a fictional sample account. Your dashboard shows your own GitHub data.</p>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-label="Features">
          <ul className="grid gap-8 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <h2 className="mt-3 text-sm font-medium">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-3">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-10 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">See your own picture.</h2>
              <p className="mt-1 text-sm text-fg-3">Connect GitHub; the first sync usually takes a minute or two.</p>
            </div>
            {user ? (
              <Button asChild variant="primary" size="lg">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <ConnectGitHubButton />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>DevTrace · Understand how you build.</span>
          <span>Not affiliated with GitHub, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
