import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoIssues } from "@/lib/demo-data";

export default function IssuesPage() {
  return (
    <DevTraceShell
      title="Issues"
      subtitle="Support, maintenance, and bug-fix flow."
      activePath="/issues"
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Opened"
            value="17"
            hint="Current account"
            accent="success"
          />
          <MetricCard label="Closed" value="11" hint="Resolved" />
          <MetricCard
            label="Open"
            value="6"
            hint="Awaiting action"
            accent="warning"
          />
          <MetricCard
            label="Avg resolve"
            value="2.6d"
            hint="Median time to close"
          />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Recent issues
          </div>
          <div className="space-y-3">
            {demoIssues.map((issue) => (
              <div
                key={issue.title}
                className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{issue.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {issue.repo} • {issue.created}
                  </div>
                </div>
                <span className="rounded-full border border-[var(--card-border)] px-2 py-1 text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  {issue.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
