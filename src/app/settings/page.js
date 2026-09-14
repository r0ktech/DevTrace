import { DevTraceShell } from "@/components/devtrace-shell";

export default function SettingsPage() {
  return (
    <DevTraceShell
      title="Settings"
      subtitle="Account, preferences, privacy, and sync controls."
      activePath="/settings"
    >
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Account
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--card)] text-sm font-medium">
                RK
              </div>
              <div>
                <div className="font-medium">Rohan K.</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  r0ktech
                </div>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                Email: rohan@example.com
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
                GitHub account: r0ktech
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Preferences
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
              Theme: System
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
              Default date range: 90 days
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
              Public profile: Off
            </div>
          </div>
        </div>
      </section>
    </DevTraceShell>
  );
}
