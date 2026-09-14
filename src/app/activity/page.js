import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoActivity } from "@/lib/demo-data";

export default function ActivityPage() {
  return (
    <DevTraceShell
      title="Activity"
      subtitle="Patterns across recent coding sessions."
      activePath="/activity"
    >
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Contribution cadence
              </div>
              <div className="mt-1 text-lg font-semibold">Weekly signal</div>
            </div>
            <div className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
              7 days
            </div>
          </div>

          <div className="flex h-56 items-end gap-3">
            {demoActivity.map((day) => (
              <div
                key={day.label}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t-md bg-[var(--foreground)]/80"
                    style={{ height: `${day.commits * 3}px` }}
                  />
                  <div
                    className="w-1/2 rounded-t-md bg-[var(--foreground)]/20"
                    style={{ height: `${day.prs * 18}px` }}
                  />
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <MetricCard
            label="Most active day"
            value="Thursday"
            hint="Higher than average by 18%"
            accent="success"
          />
          <MetricCard
            label="Average commits"
            value="14/day"
            hint="Across the last 30 days"
          />
          <MetricCard
            label="Active repositories"
            value="6"
            hint="Projects with recent growth"
            accent="warning"
          />
        </div>
      </section>
    </DevTraceShell>
  );
}
