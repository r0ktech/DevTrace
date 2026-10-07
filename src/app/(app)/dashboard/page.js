import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getOverviewMetrics, getTopRepositories } from "@/server/analytics/overview";
import { getActivitySeries, getEvents, getHeatmap } from "@/server/analytics/activity";
import { getLanguageBreakdown } from "@/server/analytics/languages";
import { cachedForUser } from "@/server/cache";
import { HEATMAP_PERIODS } from "@/lib/dates";
import { formatNumber, formatPercent, formatRelative, pluralize } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Avatar } from "@/components/app/avatar";
import { EventList } from "@/components/app/event-list";
import { HeatmapPeriodControl, RangeControl } from "@/components/app/range-control";
import { LanguageLabel, RepoFlags, RepoStats } from "@/components/app/repo-meta";
import { GitHubMark } from "@/components/brand/github-mark";
import { Heatmap } from "@/components/charts/heatmap";
import { ActivityChart } from "@/components/charts/activity-chart";
import { BarList } from "@/components/charts/bar-list";

export const metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }) {
  const params = await searchParams;
  const { user, prefs, tz, range } = await getPageContext(params);
  const heatmapPeriod = HEATMAP_PERIODS[params.heatmap] ? params.heatmap : "1y";

  // Cached per user; the cache generation is bumped after every sync
  const [metrics, series, heatmap, topRepos, events, languages] = await cachedForUser(
    user.id,
    `overview:${range}:${heatmapPeriod}:${tz}:${prefs.defaultRepoScope}`,
    () =>
      Promise.all([
        getOverviewMetrics(user.id, { range, tz }),
        getActivitySeries(user.id, { range, tz }),
        getHeatmap(user.id, { period: heatmapPeriod, tz }),
        getTopRepositories(user.id, { range, tz, limit: 6 }),
        getEvents(user.id, { limit: 8 }),
        getLanguageBreakdown(user.id, { scope: prefs.defaultRepoScope }),
      ]),
  );

  const github = user.github;
  const compare = `vs previous ${metrics.label}`;
  const hasAnyData = metrics.totalRepositories > 0 || events.events.length > 0;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar src={github?.avatarUrl} name={github?.name || github?.login} size={36} />
            <span className="min-w-0">
              <span className="block truncate">{github?.name || github?.login || user.name}</span>
              <span className="flex items-center gap-2 text-xs font-normal text-fg-3">
                <span>@{github?.login}</span>
                {github?.profileUrl && !user.isDemo && (
                  <a href={github.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                    <GitHubMark className="h-3 w-3" /> GitHub <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </span>
            </span>
          </span>
        }
        actions={<RangeControl value={range} pathname="/dashboard" searchParams={params} />}
      />

      {!hasAnyData ? (
        <Panel>
          <EmptyState
            title="No GitHub activity found yet"
            description="Your sync finished but didn't find repositories or activity. If you expected data, check that DevTrace was granted access to your repositories and sync again."
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <MetricStrip>
            <Metric
              label="Contributions"
              value={metrics.contributions.available ? formatNumber(metrics.contributions.current) : "—"}
              current={metrics.contributions.available ? metrics.contributions.current : null}
              previous={metrics.contributions.previous}
              comparisonLabel={compare}
              hint={metrics.contributions.available ? `Last ${metrics.label}` : "Calendar not synced"}
            />
            <Metric label="Commits" value={formatNumber(metrics.commits.current)} current={metrics.commits.current} previous={metrics.commits.previous} comparisonLabel={compare} hint={`Last ${metrics.label}`} />
            <Metric label="Pull requests" value={formatNumber(metrics.pullRequests.current)} current={metrics.pullRequests.current} previous={metrics.pullRequests.previous} comparisonLabel={compare} hint={`Opened, last ${metrics.label}`} />
            <Metric label="Issues" value={formatNumber(metrics.issues.current)} current={metrics.issues.current} previous={metrics.issues.previous} comparisonLabel={compare} hint={`Opened, last ${metrics.label}`} />
            <Metric
              label="Repositories"
              value={formatNumber(metrics.activeRepositories.current)}
              hint={`Active of ${formatNumber(metrics.totalRepositories)} total`}
            />
          </MetricStrip>

          <Panel
            id="heatmap"
            title="Contribution activity"
            description={
              heatmap.source === "github"
                ? `${pluralize(heatmap.total, "contribution")} in the last ${heatmap.label}, from GitHub's contribution calendar`
                : `${pluralize(heatmap.total, "event")} in the last ${heatmap.label} (commits, pull requests and issues)`
            }
            actions={<HeatmapPeriodControl value={heatmapPeriod} pathname="/dashboard" searchParams={params} />}
          >
            <Heatmap days={heatmap.days} noun={heatmap.source === "github" ? "contribution" : "event"} />
          </Panel>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <Panel id="activity" title="Activity over time" description={`By ${series.unit}, last ${series.label} · ${tz}`} className="xl:col-span-2">
              <ActivityChart points={series.points} unit={series.unit} totals={series.totals} />
            </Panel>
            <Panel
              id="recent"
              title="Recent activity"
              actions={
                <Link href="/activity" className="text-xs text-fg-3 hover:text-fg">
                  View all
                </Link>
              }
              bodyClassName="px-4 py-1"
            >
              {events.events.length ? (
                <EventList events={events.events} tz={tz} />
              ) : (
                <EmptyState compact title="No recent activity" />
              )}
            </Panel>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <Panel
              id="top-repos"
              title="Top repositories"
              description={`Ranked by your commits, pull requests and issues in the last ${metrics.label}`}
              className="xl:col-span-2"
              bodyClassName="p-0"
              actions={
                <Link href="/repositories" className="text-xs text-fg-3 hover:text-fg">
                  All repositories
                </Link>
              }
            >
              {topRepos.length ? (
                <ul>
                  {topRepos.map((repo) => (
                    <li key={repo.id} className="border-b border-border last:border-b-0">
                      <Link href={`/repositories/${repo.id}`} className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">{repo.fullName}</span>
                            <RepoFlags repo={repo} />
                          </div>
                          {repo.description && <p className="mt-0.5 line-clamp-1 text-xs text-fg-3">{repo.description}</p>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg-3">
                            <LanguageLabel language={repo.primaryLanguage} />
                            <RepoStats stars={repo.stars} forks={repo.forks} />
                            <span>Active {repo.activeDays} {repo.activeDays === 1 ? "day" : "days"}</span>
                            <span>Last activity {formatRelative(repo.lastActivity)}</span>
                          </div>
                        </div>
                        <dl className="flex shrink-0 gap-4 text-right text-xs tabular sm:w-56 sm:justify-end">
                          <div><dt className="text-2xs text-fg-3">Commits</dt><dd className="font-medium">{repo.commits}</dd></div>
                          <div><dt className="text-2xs text-fg-3">PRs</dt><dd className="font-medium">{repo.prs}</dd></div>
                          <div><dt className="text-2xs text-fg-3">Issues</dt><dd className="font-medium">{repo.issues}</dd></div>
                        </dl>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title={`No repository activity in the last ${metrics.label}`} description="Try a longer date range." />
              )}
            </Panel>

            <Panel
              id="languages"
              title="Languages"
              description="Share of code across your repositories"
              actions={
                <Link href="/languages" className="text-xs text-fg-3 hover:text-fg">
                  Details
                </Link>
              }
            >
              {languages.byBytes.length ? (
                <BarList
                  items={languages.byBytes.slice(0, 6).map((l) => ({
                    label: l.language,
                    value: l.bytes,
                    display: formatPercent(l.share * 100, 1),
                    swatch: l.color || "var(--fg-3)",
                  }))}
                />
              ) : (
                <EmptyState compact title="No language data yet" />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
