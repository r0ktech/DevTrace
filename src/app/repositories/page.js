import { Search, Star } from "lucide-react";
import { DevTraceShell } from "@/components/devtrace-shell";
import { demoRepositories } from "@/lib/demo-data";

export default function RepositoriesPage() {
  return (
    <DevTraceShell
      title="Repositories"
      subtitle="The projects that attract your focus."
      activePath="/repositories"
    >
      <section className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--panel)] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--muted-foreground)] md:min-w-[280px]">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-[var(--muted-foreground)]"
              placeholder="Search repositories"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            <button className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-2">
              Owned
            </button>
            <button className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-2">
              Forks
            </button>
            <button className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-2">
              Active
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--panel)]">
          <div className="grid grid-cols-[minmax(200px,2fr)_0.9fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            <div>Repository</div>
            <div>Language</div>
            <div>Stars</div>
            <div>Forks</div>
            <div>Commits</div>
            <div>PRs</div>
          </div>

          {demoRepositories.map((repo) => (
            <div
              key={repo.name}
              className="grid grid-cols-[minmax(200px,2fr)_0.9fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-[var(--card-border)] px-4 py-4 text-sm last:border-b-0"
            >
              <div>
                <div className="font-medium">{repo.name}</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {repo.lastActivity}
                </div>
              </div>
              <div>{repo.language}</div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {repo.stars}
              </div>
              <div>{repo.forks}</div>
              <div>{repo.commits}</div>
              <div>{repo.prs}</div>
            </div>
          ))}
        </div>
      </section>
    </DevTraceShell>
  );
}
