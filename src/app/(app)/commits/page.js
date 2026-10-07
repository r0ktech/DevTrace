import { ArrowUpRight } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getCommitSummary, listCommits } from "@/server/analytics/commits";
import { getActivitySeries } from "@/server/analytics/activity";
import { listRepositoryOptions } from "@/server/analytics/repositories";
import { commitsQuery, safeSearchParams } from "@/server/validation";
import { WEEKDAYS } from "@/lib/dates";
import { firstLine, formatDateTime, formatHour, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { RangeControl } from "@/components/app/range-control";
import { ParamSelect } from "@/components/app/repo-select";
import { SearchInput } from "@/components/app/search-input";
import { CommitTimeChart } from "@/components/app/commit-charts";
import { ColumnChart } from "@/components/charts/column-chart";
import Link from "next/link";

export const metadata = { title: "Commits" };

export default async function CommitsPage({ searchParams }) {
  const params = await searchParams;
  const { user, tz, range } = await getPageContext(params);
  const query = safeSearchParams(commitsQuery, params);
  const repositoryId = query.repo;

  const [summary, commits, repos, byDay, byWeek, byMonth] = await Promise.all([
    getCommitSummary(user.id, { range, tz, repositoryId }),
    listCommits(user.id, { repositoryId, search: query.q, page: query.page, pageSize: query.pageSize }),
    listRepositoryOptions(user.id),
    getActivitySeries(user.id, { range, tz, repositoryId, unit: "day" }),
    getActivitySeries(user.id, { range, tz, repositoryId, unit: "week" }),
    getActivitySeries(user.id, { range, tz, repositoryId, unit: "month" }),
  ]);

  const pick = (s) => s.points.map((p) => ({ key: p.key, value: p.commits }));
  const timeSeries = { day: pick(byDay), week: pick(byWeek), month: pick(byMonth) };
  const weekdayData = WEEKDAYS.map((d, i) => ({ key: d, label: d, value: summary.rhythm.weekdays[i] }));
  const hourData = summary.rhythm.hours.map((v, h) => ({ key: String(h), label: formatHour(h), value: v }));

  return (
    <>
      <PageHeader
        title="Commits"
        description="Commits you authored on default branches, as recorded by GitHub."
        actions={
          <>
            <ParamSelect param="repo" value={repositoryId} label="Filter by repository" allLabel="All repositories" options={repos.map((r) => ({ value: r.id, label: r.fullName }))} />
            <RangeControl value={range} pathname="/commits" searchParams={params} />
          </>
        }
      />
      <div className="space-y-4">
        <MetricStrip>
          <Metric label="Total commits" value={formatNumber(summary.total)} hint="All synced history" />
          <Metric label="This month" value={formatNumber(summary.thisMonth)} hint="Since the 1st" />
          <Metric label="Average / week" value={summary.averagePerWeek.toFixed(1)} hint={`Over the last ${summary.label}`} />
          <Metric label="Most active day" value={summary.busiestDay == null ? "—" : WEEKDAYS[summary.busiestDay]} hint={`Last ${summary.label}`} />
          <Metric label="Most active hour" value={summary.busiestHour == null ? "—" : formatHour(summary.busiestHour)} hint={tz} />
        </MetricStrip>

        <Panel id="commit-time" title="Commits over time" description={`Last ${summary.label} · ${formatNumber(summary.inRange)} commits`}>
          <CommitTimeChart series={timeSeries} />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel id="by-weekday" title="By weekday" description={`Last ${summary.label} · ${tz}`}>
            <ColumnChart data={weekdayData} noun="commit" height={180} emptyText="No commits in this period." />
          </Panel>
          <Panel id="by-hour" title="By hour of day" description={`Last ${summary.label} · ${tz}`}>
            <ColumnChart data={hourData} noun="commit" height={180} emptyText="No commits in this period." />
          </Panel>
        </div>

        <Panel title="Commit history" bodyClassName="p-0" actions={<SearchInput placeholder="Search commit messages" />}>
          {commits.rows.length === 0 ? (
            <EmptyState title={query.q ? "No commits match this search." : "No commits found."} description={query.q ? "Commit messages are searched exactly as written." : undefined} />
          ) : (
            <>
              <Table label="Commits">
                <thead>
                  <tr>
                    <Th>Repository</Th>
                    <Th>Commit message</Th>
                    <Th>Author</Th>
                    <Th align="right">Date</Th>
                    <Th align="right"><span className="sr-only">Link</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {commits.rows.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/60">
                      <Td className="whitespace-nowrap text-xs">
                        <Link href={`/repositories/${c.repository.id}`} className="text-fg-2 hover:text-fg hover:underline">{c.repository.fullName}</Link>
                      </Td>
                      <Td className="min-w-72">
                        <span className="break-words" title={c.message}>{firstLine(c.message)}</span>
                        <span className="ml-2 font-mono text-2xs text-fg-3">{c.sha.slice(0, 7)}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-fg-2">{c.authorLogin || c.authorName || "—"}</Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{formatDateTime(c.committedAt, { tz })}</Td>
                      <Td align="right">
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex text-fg-3 hover:text-fg" aria-label={`Open commit ${c.sha.slice(0, 7)} on GitHub`}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-2xs text-fg-3">Sample</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination {...commits} pathname="/commits" searchParams={params} noun="commits" />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
