import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoPullRequests } from "@/lib/demo-data";

export default function PullRequestsPage() {
  return (
    <DevTraceShell
      title="Pull requests"
      subtitle="Review workflow, review load, and merge speed."
      activePath="/pull-requests"
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Total"
            value="28"
            hint="Across active repos"
            accent="success"
          />
          <MetricCard label="Opened" value="11" hint="In the current period" />
          <MetricCard
            label="Merged"
            value="15"
            hint="Completed successfully"
            accent="warning"
          />
          <MetricCard label="Avg time" value="3.4d" hint="To merge" />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Recent pull requests
          </div>
          <div className="space-y-3">
            {demoPullRequests.map((pr) => (
              <div
                key={pr.title}
                className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{pr.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {pr.repo} • {pr.created}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                  <span className="rounded-full border border-[var(--card-border)] px-2 py-1 text-xs uppercase tracking-[0.12em]">
                    {pr.status}
                  </span>
                  <span>{pr.merged}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
