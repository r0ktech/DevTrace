import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, EyeOff, MapPin } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getProfile } from "@/server/analytics/profile";
import { formatNumber, formatPercent } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { GitHubMark } from "@/components/brand/github-mark";
import { Avatar } from "@/components/app/avatar";
import { LanguageLabel, RepoStats } from "@/components/app/repo-meta";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Heatmap } from "@/components/charts/heatmap";
import { ShareBar } from "@/components/charts/share-bar";

export const dynamic = "force-dynamic";

const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

export async function generateMetadata({ params }) {
  const { login } = await params;
  return { title: `@${login}`, robots: { index: false } };
}

export default async function ProfilePage({ params }) {
  const { login } = await params;
  if (!LOGIN.test(login)) notFound();
  const viewer = await getCurrentUser();
  const profile = await getProfile(login, { viewerId: viewer?.id });
  if (!profile) notFound();
  const { account, stats } = profile;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="DevTrace home"><Logo /></Link>
        {profile.isOwner && (
          <Link href="/settings" className="text-xs text-fg-3 hover:text-fg">Profile settings</Link>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        {profile.isOwner && !profile.isPublic && (
          <p className="mb-6 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-fg-2">
            <EyeOff className="h-4 w-4 text-fg-3" aria-hidden="true" /> Only you can see this profile. Make it public in Settings → Privacy.
          </p>
        )}
        {profile.isDemo && (
          <p className="mb-6 rounded-md border border-warning/40 px-3 py-2 text-sm text-warning">Demo profile with fictional sample data.</p>
        )}

        <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar src={account.avatarUrl} name={account.name || account.login} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{account.name || account.login}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-3">
              <span>@{account.login}</span>
              {account.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{account.location}</span>}
              {account.profileUrl && (
                <a href={account.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <GitHubMark className="h-3.5 w-3.5" /> GitHub <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </p>
            {account.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-2">{account.bio}</p>}
          </div>
        </section>

        {profile.showActivity && (
          <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-surface sm:grid-cols-4">
            {[
              ["Commits", stats.commits, "last 12 months"],
              ["Pull requests", stats.pullRequests, `${formatNumber(stats.merged)} merged`],
              ["Issues", stats.issues, "last 12 months"],
              ["Repositories", stats.repositories, "shown on profile"],
            ].map(([label, value, hint]) => (
              <div key={label} className="-mb-px -mr-px border-b border-r border-border px-4 py-3">
                <dt className="text-xs text-fg-3">{label}</dt>
                <dd className="mt-1 text-xl font-medium tabular">{formatNumber(value)}</dd>
                <dd className="text-2xs text-fg-3">{hint}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-4 space-y-4">
          {profile.heatmap && (
            <Panel title="Activity" description={profile.heatmap.source === "github" ? "GitHub contributions, last year" : "Commits, pull requests and issues in public repositories, last year"}>
              <Heatmap days={profile.heatmap.days} noun={profile.heatmap.source === "github" ? "contribution" : "event"} />
            </Panel>
          )}

          {profile.languages.length > 0 && (
            <Panel title="Primary languages" description="Share of code across repositories shown on this profile">
              <ShareBar
                label="Language share"
                items={profile.languages.map((l, i) => ({ label: l.language, share: l.share, color: l.color || (i % 2 ? "var(--border-strong)" : "var(--fg-3)") }))}
              />
            </Panel>
          )}

          <Panel title="Featured repositories" description="Ranked by commits in the last 12 months" bodyClassName="p-0">
            {profile.featured.length ? (
              <ul className="grid sm:grid-cols-2">
                {profile.featured.map((repo) => (
                  <li key={repo.id} className="border-b border-border p-4 sm:odd:border-r">
                    <p className="text-sm font-medium">
                      {repo.url ? <a href={repo.url} target="_blank" rel="noreferrer" className="hover:underline">{repo.fullName}</a> : repo.fullName}
                    </p>
                    {repo.description && <p className="mt-1 line-clamp-2 text-xs text-fg-3">{repo.description}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-2xs text-fg-3">
                      <LanguageLabel language={repo.primaryLanguage} />
                      <RepoStats stars={repo.stars} forks={repo.forks} />
                      {profile.showActivity && <span>{formatNumber(repo.commits)} commits</span>}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="No repositories to show" />
            )}
          </Panel>
        </div>
        <p className="mt-8 text-center text-2xs text-fg-3">
          Built with <Link href="/" className="hover:text-fg">DevTrace</Link> from {account.login}&apos;s GitHub activity{profile.languages.length ? ` · top language ${profile.languages[0].language} (${formatPercent(profile.languages[0].share * 100)})` : ""}.
        </p>
      </main>
    </div>
  );
}
