import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  FileText,
  Github,
  LayoutDashboard,
  LogOut,
  MoonStar,
  Settings,
  Sparkles,
  SunMedium,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: BarChart3 },
  { href: "/repositories", label: "Repositories", icon: BookOpenText },
  { href: "/commits", label: "Commits", icon: FileText },
  { href: "/pull-requests", label: "Pull Requests", icon: BriefcaseBusiness },
  { href: "/issues", label: "Issues", icon: Sparkles },
  { href: "/languages", label: "Languages", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ href, label, icon: Icon, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
        active
          ? "bg-[var(--panel)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function DevTraceShell({
  title,
  subtitle,
  children,
  activePath = "/dashboard",
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 xl:px-6">
        <aside className="hidden w-[260px] shrink-0 flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--sidebar)] p-4 lg:flex">
          <div>
            <div className="mb-8 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card)] font-mono text-sm font-semibold">
                D
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[-0.05em]">
                  DevTrace
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  analytics
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map(({ href, label, icon }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={href === activePath}
                />
              ))}
            </nav>
          </div>

          <div className="space-y-3 border-t border-[var(--card-border)] pt-4">
            <div className="flex items-center gap-3 rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel)] text-xs font-medium">
                RK
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">r0ktech</div>
                <div className="truncate text-[11px] text-[var(--muted-foreground)]">
                  GitHub account
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <MoonStar className="h-4 w-4" />
                Theme
              </div>
              <SunMedium className="h-4 w-4" />
            </div>

            <button className="flex w-full items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-left text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button className="flex w-full items-center justify-between rounded-md border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-left text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6">
          <header className="flex flex-col gap-4 border-b border-[var(--card-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                DevTrace
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.06em] sm:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button className="inline-flex items-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--panel)] px-3 py-2 text-sm font-medium">
                <Github className="h-4 w-4" />
                GitHub
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-[var(--foreground)] px-3 py-2 text-sm font-medium text-[var(--background)]">
                Sync
              </button>
            </div>
          </header>

          <div className="pt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function MetricCard({ label, value, hint, accent = "neutral" }) {
  const accentClass =
    accent === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : accent === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-[var(--panel)] text-[var(--muted-foreground)]";

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--panel)] p-4">
      <div
        className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${accentClass}`}
      >
        {label}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.08em]">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
