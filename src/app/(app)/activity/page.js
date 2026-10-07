import { getPageContext } from "@/server/page-context";
import { getActivitySeries, getCommitRhythm, getEvents, getHeatmap } from "@/server/analytics/activity";
import { listRepositoryOptions } from "@/server/analytics/repositories";
import { computeStreaks } from "@/server/analytics/aggregate";
import { HEATMAP_PERIODS, WEEKDAYS, localDateKey, resolveRange } from "@/lib/dates";
import { formatHour, formatNumber, pluralize } from "@/lib/format";
import { idSchema } from "@/server/validation";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { HeatmapPeriodControl, RangeControl } from "@/components/app/range-control";
import { ParamSelect } from "@/components/app/repo-select";
import { EventFeed } from "@/components/app/event-feed";
import { Heatmap } from "@/components/charts/heatmap";
import { ActivityChart } from "@/components/charts/activity-chart";
import { Punchcard } from "@/components/charts/punchcard";

export const metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }) {
  const params = await searchParams;
  const { user, tz, range } = await getPageContext(params);
  const heatmapPeriod = HEATMAP_PERIODS[params.heatmap] ? params.heatmap : "1y";
  const repositoryId = idSchema.safeParse(params.repo).success ? params.repo : undefined;

  const [series, heatmap, rhythm, events, repos, yearHeatmap] = await Promise.all([
    getActivitySeries(user.id, { range, tz, repositoryId }),
    getHeatmap(user.id, { period: heatmapPeriod, tz }),
    getCommitRhythm(user.id, { since: resolveRange(range, { tz }).start, tz, repositoryId }),
    getEvents(user.id, { repositoryId, limit: 25 }),
    listRepositoryOptions(user.id),
    getHeatmap(user.id, { period: "1y", tz }),
  ]);

  const streaks = computeStreaks(yearHeatmap.days, localDateKey(new Date(), tz));
  const busiestDay = rhythm.total ? rhythm.weekdays.indexOf(Math.max(...rhythm.weekdays)) : null;
  const busiestHour = rhythm.total ? rhythm.hours.indexOf(Math.max(...rhythm.hours)) : null;

  return (
    <>
      <PageHeader
        title="Activity"
        description="How consistently you work, and when."
        actions={
          <>
            <ParamSelect
              param="repo"
              value={repositoryId}
              label="Filter by repository"
              allLabel="All repositories"
              options={repos.map((r) => ({ value: r.id, label: r.fullName }))}
            />
            <RangeControl value={range} pathname="/activity" searchParams={params} />
          </>
        }
      />
      <div className="space-y-4">
        <MetricStrip className="lg:grid-cols-4">
          <Metric label="Current streak" value={pluralize(streaks.current, "day")} hint="Consecutive active days" />
          <Metric label="Longest streak" value={pluralize(streaks.longest, "day")} hint="In the last year" />
          <Metric label="Active days" value={formatNumber(streaks.activeDays)} hint="In the last year" />
          <Metric
            label="Most active"
            value={busiestDay == null ? "—" : `${WEEKDAYS[busiestDay]} ${formatHour(busiestHour)}`}
            hint={busiestDay == null ? "No commits in range" : `Busiest weekday and hour · ${tz}`}
          />
        </MetricStrip>

        <Panel
          id="heatmap"
          title="Contribution calendar"
          description={heatmap.source === "github" ? "Daily contributions from GitHub, including reviews and other contribution types" : "Daily commits, pull requests and issues"}
          actions={<HeatmapPeriodControl value={heatmapPeriod} pathname="/activity" searchParams={params} />}
        >
          <Heatmap days={heatmap.days} noun={heatmap.source === "github" ? "contribution" : "event"} />
        </Panel>

        <Panel id="series" title="Activity over time" description={`By ${series.unit}, last ${series.label}${repositoryId ? " · filtered by repository" : ""}`}>
          <ActivityChart points={series.points} unit={series.unit} totals={series.totals} height={260} />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-5">
          <Panel id="rhythm" title="When you commit" description={`Weekday and hour, last ${series.label} · ${tz}`} className="xl:col-span-3">
            {rhythm.total ? <Punchcard matrix={rhythm.matrix} tz={tz} /> : <EmptyState compact title="No commits in this period" />}
          </Panel>
          <Panel id="events" title="Timeline" className="xl:col-span-2" bodyClassName="px-4 py-1">
            {events.events.length ? (
              <EventFeed initial={events} repositoryId={repositoryId} tz={tz} />
            ) : (
              <EmptyState compact title="No events yet" />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
