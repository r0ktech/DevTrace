import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getInsights } from "@/server/analytics/insights";
import { getRecap } from "@/server/analytics/recap";
import { formatDayKey, formatNumber, pluralize } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { SegmentedLinks } from "@/components/ui/segmented";
import { WeeklySummaryPanel } from "@/components/app/weekly-summary";
import { aiSummaryEnabled, getLatestSummary } from "@/server/ai/weekly-summary";
import { cachedForUser } from "@/server/cache";

export const metadata = { title: "Insights" };

const RECAP_PERIODS = [
  { value: "7", label: "This week" },
  { value: "30", label: "This month" },
];

function TrendIcon({ tone }) {
  if (tone === "up") return <ArrowUpRight className="h-4 w-4 text-delta-up" aria-label="Increase" />;
  if (tone === "down") return <ArrowDownRight className="h-4 w-4 text-delta-down" aria-label="Decrease" />;
  return <Minus className="h-4 w-4 text-fg-3" aria-hidden="true" />;
}

export default async function InsightsPage({ searchParams }) {
  const params = await searchParams;
  const { user, tz } = await getPageContext(params);
  const recapDays = params.recap === "30" ? 30 : 7;

  const [{ insights }, recap, summary] = await Promise.all([
    cachedForUser(user.id, `insights:${tz}`, () => getInsights(user.id, { tz }), 600),
    cachedForUser(user.id, `recap:${recapDays}:${tz}`, () => getRecap(user.id, { days: recapDays, tz })),
    getLatestSummary(user.id),
  ]);
  const ready = insights.filter((i) => i.status === "ok");
  const pending = insights.filter((i) => i.status === "insufficient");
  const recapEmpty = recap.commits + recap.pullRequestsOpened + recap.issuesOpened + recap.issuesClosed + recap.pullRequestsMerged === 0;

  return (
    <>
      <PageHeader title="Insights" description="Observations calculated from your synced activity. Each one shows the numbers behind it." />
      <div className="space-y-4">
        <Panel
          id="recap"
          title={recapDays === 7 ? "Your last 7 days" : "Your last 30 days"}
          description={`Since ${formatDayKey(recap.startKey, { month: "short", day: "numeric" })} · ${tz}`}
          actions={<SegmentedLinks label="Recap period" options={RECAP_PERIODS} param="recap" value={String(recapDays)} pathname="/insights" searchParams={params} />}
        >
          {recapEmpty ? (
            <EmptyState compact title="No activity in this period." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <p className="text-sm leading-relaxed">
                  You made <strong className="font-medium">{pluralize(recap.commits, "commit")}</strong> on{" "}
                  <strong className="font-medium">{pluralize(recap.activeDays, "day")}</strong> across{" "}
                  <strong className="font-medium">{pluralize(recap.repositories.length, "repository", "repositories")}</strong>, opened{" "}
                  <strong className="font-medium">{pluralize(recap.pullRequestsOpened, "pull request")}</strong> and merged{" "}
                  <strong className="font-medium">{formatNumber(recap.pullRequestsMerged)}</strong>. You opened{" "}
                  <strong className="font-medium">{pluralize(recap.issuesOpened, "issue")}</strong> and{" "}
                  <strong className="font-medium">{formatNumber(recap.issuesClosed)}</strong> of yours were closed.
                </p>
                {recap.repositories.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {recap.repositories.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex justify-between gap-4">
                        <Link href={`/repositories/${r.id}`} className="truncate hover:underline">{r.name}</Link>
                        <span className="tabular text-xs text-fg-3">{pluralize(r.count, "event")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="lg:col-span-3">
                <h3 className="mb-2 text-xs font-medium text-fg-3">Merged pull requests</h3>
                {recap.mergedPullRequests.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {recap.mergedPullRequests.slice(0, 8).map((pr) => (
                      <li key={pr.id} className="flex gap-2">
                        <span className="shrink-0 tabular text-xs leading-5 text-fg-3">#{pr.number}</span>
                        <span className="min-w-0">
                          {pr.url ? <a href={pr.url} target="_blank" rel="noreferrer" className="hover:underline">{pr.title}</a> : pr.title}
                          <span className="ml-2 text-xs text-fg-3">{pr.repository.fullName}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-fg-3">No pull requests merged in this period.</p>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel id="observations" title="Observations" bodyClassName="p-0">
          {ready.length === 0 ? (
            <EmptyState title="Not enough activity yet to identify a reliable pattern." description="Insights appear once there's enough history to compare. See what each one needs below." />
          ) : (
            <ul>
              {ready.map((insight) => (
                <li key={insight.id} className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-[180px_1fr_minmax(220px,auto)] md:items-start">
                  <span className="text-xs font-medium text-fg-3">{insight.title}</span>
                  <p className="flex items-start gap-2 text-sm leading-snug">
                    {insight.tone && <TrendIcon tone={insight.tone} />}
                    {insight.headline}
                  </p>
                  <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs md:justify-end">
                    {insight.evidence.map((e) => (
                      <div key={e.label} className="contents">
                        <dt className="truncate text-fg-3">{e.label}</dt>
                        <dd className="tabular text-right text-fg-2">{e.value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {pending.length > 0 && (
          <Panel id="pending" title="Not enough data yet" description="These insights are withheld until they can be calculated reliably." bodyClassName="p-0">
            <ul>
              {pending.map((insight) => (
                <li key={insight.id} className="flex flex-col gap-1 border-b border-border px-4 py-3 text-sm last:border-b-0 sm:flex-row sm:gap-6">
                  <span className="shrink-0 text-xs font-medium text-fg-3 sm:w-[180px]">{insight.title}</span>
                  <span className="text-fg-2">{insight.requirement}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <WeeklySummaryPanel enabled={aiSummaryEnabled()} isDemo={user.isDemo} initial={summary} />
      </div>
    </>
  );
}
