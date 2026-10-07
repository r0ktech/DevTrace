import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Globe, Lock } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getRepository } from "@/server/analytics/repositories";
import { getActivitySeries, getEvents } from "@/server/analytics/activity";
import { getRepositoryContributors } from "@/server/services/contributors";
import { idSchema } from "@/server/validation";
import { formatCompact, formatDate, formatNumber, formatPercent, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app/avatar";
import { EventFeed } from "@/components/app/event-feed";
import { RangeControl } from "@/components/app/range-control";
import { RepoFlags } from "@/components/app/repo-meta";
import { ActivityChart } from "@/components/charts/activity-chart";
import { BarList } from "@/components/charts/bar-list";

export const metadata = { title: "Repository" };

function Fact({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
      <dt className="text-fg-3">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function RepositoryPage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!idSchema.safeParse(id).success) notFound();
  const { user, tz, range } = await getPageContext(query);

  // getRepository scopes by user id: other users' repositories are a 404
  const detail = await getRepository(user.id, id);
  if (!detail) notFound();
  const { repo, stats } = detail;

  const [series, timeline, contributors] = await Promise.all([
    getActivitySeries(user.id, { range, tz, repositoryId: id }),
    getEvents(user.id, { repositoryId: id, limit: 25 }),
    getRepositoryContributors(user.id, id),
  ]);
  const languageTotal = repo.languageStats.reduce((t, l) => t + l.bytes, 0);
  const prTotal = stats.pullRequests.open + stats.pullRequests.merged + stats.pullRequests.closed;
  const pathname = `/repositories/${id}`;

  return (
    <>
      <Link href="/repositories" className="mb-3 inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
        <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Repositories
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-all">{repo.fullName}</span>
            <RepoFlags repo={repo} />
          </span>
        }
        description={repo.description || "No description on GitHub."}
        actions={
          <>
            {repo.url && (
              <Button asChild variant="secondary" size="md">
                <a href={repo.url} target="_blank" rel="noreferrer">
                  View on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </Button>
            )}
            <RangeControl value={range} pathname={pathname} searchParams={query} />
          </>
        }
      />

      {repo.removedAt && (
        <p role="status" className="mb-4 rounded-md border border-warning/40 px-3 py-2 text-sm text-warning">
          GitHub no longer returns this repository (deleted, renamed or access removed) since {formatDate(repo.removedAt)}. Your past activity is kept.
        </p>
      )}

      <div className="space-y-4">
        <MetricStrip className="lg:grid-cols-4">
          <Metric label="Your commits" value={formatNumber(stats.commits)} hint="All synced history" />
          <Metric label="Pull requests" value={formatNumber(prTotal)} hint={`${stats.pullRequests.merged} merged · ${stats.pullRequests.open} open`} />
          <Metric label="Issues opened" value={formatNumber(stats.issues.open + stats.issues.closed)} hint={`${stats.issues.closed} closed · ${stats.issues.open} open`} />
          <Metric label="Last activity" value={stats.lastActivity ? formatRelative(stats.lastActivity) : "—"} hint={stats.firstActivity ? `First: ${formatDate(stats.firstActivity)}` : "No activity recorded"} />
        </MetricStrip>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel id="repo-activity" title="Your activity" description={`By ${series.unit}, last ${series.label}`} className="xl:col-span-2">
            <ActivityChart points={series.points} unit={series.unit} totals={series.totals} />
          </Panel>
          <Panel id="overview" title="Overview">
            <dl>
              <Fact label="Visibility">
                <span className="inline-flex items-center gap-1">
                  {repo.isPrivate ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Globe className="h-3 w-3" aria-hidden="true" />}
                  {repo.isPrivate ? "Private" : "Public"}
                </span>
              </Fact>
              <Fact label="Primary language">{repo.primaryLanguage || "—"}</Fact>
              <Fact label="Stars">{formatCompact(repo.stars)}</Fact>
              <Fact label="Forks">{formatCompact(repo.forks)}</Fact>
              <Fact label="Open issues">{formatNumber(repo.openIssues)}</Fact>
              <Fact label="Default branch"><span className="font-mono text-xs">{repo.defaultBranch || "—"}</span></Fact>
              <Fact label="Created">{formatDate(repo.repoCreatedAt)}</Fact>
              <Fact label="Last push">{formatDate(repo.repoPushedAt)}</Fact>
            </dl>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel id="timeline" title="Development timeline" description="Your commits, pull requests and issues in this repository, newest first" className="xl:col-span-2" bodyClassName="px-4 py-1">
            {timeline.events.length ? (
              <EventFeed initial={timeline} repositoryId={id} tz={tz} />
            ) : (
              <EmptyState compact title="No activity from you in this repository yet" />
            )}
          </Panel>

          <div className="space-y-4">
            <Panel id="contributors" title="Contributors" description="Commits on the default branch, from GitHub">
              {contributors?.contributors.length ? (
                <ul className="space-y-2.5">
                  {contributors.contributors.map((c) => (
                    <li key={c.login} className="flex items-center gap-2.5 text-sm">
                      <Avatar src={c.avatarUrl} name={c.login} size={22} />
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">{c.login}</a>
                      ) : (
                        <span className="min-w-0 flex-1 truncate">{c.login}</span>
                      )}
                      <span className="tabular text-xs text-fg-3">{formatNumber(c.contributions)} · {formatPercent(c.share * 100)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title={contributors?.error || "No contributor data available"} />
              )}
              {contributors?.error && contributors.contributors.length > 0 && <p className="mt-3 text-2xs text-fg-3">{contributors.error} Showing the last stored list.</p>}
            </Panel>

            <Panel id="repo-languages" title="Languages" description="Bytes of code, from GitHub">
              {repo.languageStats.length ? (
                <BarList
                  items={repo.languageStats.slice(0, 8).map((l) => ({
                    label: l.language,
                    value: l.bytes,
                    display: formatPercent((l.bytes / languageTotal) * 100, 1),
                    swatch: l.color || "var(--fg-3)",
                  }))}
                />
              ) : (
                <EmptyState compact title="No language data for this repository" />
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
