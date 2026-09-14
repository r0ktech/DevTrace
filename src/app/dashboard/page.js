import Link from "next/link";
import {
  ArrowUpRight,
  GitBranch,
  GitCommitVertical,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import {
  demoActivity,
  demoMetrics,
  demoProfile,
  demoRepositories,
  demoInsights,
} from "@/lib/demo-data";

export default function DashboardPage() {
  return (
    <DevTraceShell
      title="Overview"
      subtitle="What you have been building recently."
      activePath="/dashboard"
    >
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={demoProfile.avatar}
              alt={demoProfile.username}
              className="h-14 w-14 rounded-full border border-[var(--card-border)]"
            />
            <div>
              <div className="text-2xl font-semibold tracking-[-0.06em]">
                {demoProfile.name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <span>@{demoProfile.username}</span>
                <span>•</span>
                <a
                  href={demoProfile.githubUrl}
                  className="inline-flex items-center gap-1 text-[var(--foreground)]"
                >
                  GitHub <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Focus
              </div>
              <div className="mt-1 font-medium">Platform</div>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Location
              </div>
              <div className="mt-1 font-medium">London</div>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Status
              </div>
              <div className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">
                Active
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Contributions"
            value={demoMetrics.contributions}
            hint="Last 90 days"
            accent="success"
          />
          <MetricCard
            label="Commits"
            value={demoMetrics.commits}
            hint="Current cycle"
            accent="warning"
          />
          <MetricCard
            label="PRs"
            value={demoMetrics.pullRequests}
            hint="Opened and merged"
          />
          <MetricCard
            label="Issues"
            value={demoMetrics.issues}
            hint="Closed + open"
          />
          <MetricCard
            label="Repos"
            value={demoMetrics.repositories}
            hint="Active projects"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Activity
                </div>
                <div className="mt-1 text-lg font-semibold">
                  Development activity
                </div>
              </div>
              <div className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
                90 days
              </div>
            </div>

            <div className="flex h-52 items-end gap-3">
              {demoActivity.map((day) => (
                <div
                  key={day.label}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div
                      className="w-1/3 rounded-t-md bg-[var(--foreground)]/80"
                      style={{ height: `${day.commits * 2.5}px` }}
                    />
                    <div
                      className="w-1/3 rounded-t-md bg-[var(--foreground)]/35"
                      style={{ height: `${day.prs * 22}px` }}
                    />
                    <div
                      className="w-1/3 rounded-t-md bg-[var(--foreground)]/15"
                      style={{ height: `${day.issues * 20}px` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Insights
                </div>
                <div className="mt-1 text-lg font-semibold">Patterns</div>
              </div>
            </div>

            <div className="space-y-3">
              {demoInsights.map((insight, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm leading-6 text-[var(--muted-foreground)]"
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Top repositories
              </div>
              <div className="mt-1 text-lg font-semibold">Most attention</div>
            </div>
            <Link
              href="/repositories"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {demoRepositories.map((repo) => (
              <div
                key={repo.name}
                className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span className="font-medium">{repo.name}</span>
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {repo.description}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <span>{repo.language}</span>
                  <span>★ {repo.stars}</span>
                  <span>⎇ {repo.forks}</span>
                  <span>Commits {repo.commits}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
