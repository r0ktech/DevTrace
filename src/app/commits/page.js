import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoCommits } from "@/lib/demo-data";

export default function CommitsPage() {
  return (
    <DevTraceShell
      title="Commits"
      subtitle="Your actual change history and commit rhythm."
      activePath="/commits"
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Total"
            value="126"
            hint="Across all repos"
            accent="success"
          />
          <MetricCard label="This month" value="31" hint="Last 30 days" />
          <MetricCard
            label="Average / week"
            value="7.8"
            hint="Consistent cadence"
            accent="warning"
          />
          <MetricCard label="Peak hour" value="18:00" hint="Local time" />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Recent commits
          </div>
          <div className="space-y-3">
            {demoCommits.map((commit) => (
              <div
                key={commit.message}
                className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{commit.message}</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {commit.repo} • {commit.author}
                  </div>
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {commit.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
