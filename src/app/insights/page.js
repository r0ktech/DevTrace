import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoInsights } from "@/lib/demo-data";

export default function InsightsPage() {
  return (
    <DevTraceShell
      title="Insights"
      subtitle="Calculated observations from your real activity patterns."
      activePath="/insights"
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Velocity"
            value="+24%"
            hint="Compared with previous 30 days"
            accent="success"
          />
          <MetricCard
            label="Top repo"
            value="devtrace"
            hint="Largest share of recent work"
          />
          <MetricCard
            label="Best days"
            value="Thu/Fri"
            hint="Most active weekdays"
            accent="warning"
          />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Calculated observations
          </div>
          <div className="space-y-3">
            {demoInsights.map((insight, index) => (
              <div
                key={insight}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm leading-6 text-[var(--muted-foreground)]"
              >
                <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--foreground)]">
                  Observation {index + 1}
                </div>
                {insight}
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
