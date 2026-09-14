import { DevTraceShell, MetricCard } from "@/components/devtrace-shell";
import { demoLanguages } from "@/lib/demo-data";

export default function LanguagesPage() {
  return (
    <DevTraceShell
      title="Languages"
      subtitle="Language usage across your active repositories."
      activePath="/languages"
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Primary"
            value="JavaScript"
            hint="Largest share"
            accent="success"
          />
          <MetricCard
            label="Secondary"
            value="TypeScript"
            hint="Second largest"
          />
          <MetricCard
            label="Projects"
            value="12"
            hint="Across active repos"
            accent="warning"
          />
          <MetricCard
            label="Coverage"
            value="89%"
            hint="Based on repo language stats"
          />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Language distribution
          </div>
          <div className="space-y-4">
            {demoLanguages.map((language) => (
              <div key={language.language}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{language.language}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {language.value}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--card)]">
                  <div
                    className="h-full rounded-full bg-[var(--foreground)]"
                    style={{ width: `${language.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
