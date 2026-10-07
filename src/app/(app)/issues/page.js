import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getIssueSummary, listIssues } from "@/server/analytics/issues";
import { getActivitySeries } from "@/server/analytics/activity";
import { listRepositoryOptions } from "@/server/analytics/repositories";
import { issuesQuery, safeSearchParams } from "@/server/validation";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { SegmentedLinks } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { RangeControl } from "@/components/app/range-control";
import { ParamSelect } from "@/components/app/repo-select";
import { SearchInput } from "@/components/app/search-input";
import { IssueState } from "@/components/app/state-badge";
import { ColumnChart } from "@/components/charts/column-chart";

export const metadata = { title: "Issues" };

const STATES = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export default async function IssuesPage({ searchParams }) {
  const params = await searchParams;
  const { user, tz, range } = await getPageContext(params);
  const query = safeSearchParams(issuesQuery, params);

  const [summary, issues, repos, series] = await Promise.all([
    getIssueSummary(user.id, { range, tz, repositoryId: query.repo }),
    listIssues(user.id, { state: query.state, repositoryId: query.repo, search: query.q, page: query.page, pageSize: query.pageSize }),
    listRepositoryOptions(user.id),
    getActivitySeries(user.id, { range, tz, repositoryId: query.repo }),
  ]);
  const chart = series.points.map((p) => ({ key: p.key, value: p.issues }));
  const filtered = Boolean(query.state || query.repo || query.q);

  return (
    <>
      <PageHeader
        title="Issues"
        description="Issues you opened on GitHub."
        actions={
          <>
            <ParamSelect param="repo" value={query.repo} label="Filter by repository" allLabel="All repositories" options={repos.map((r) => ({ value: r.id, label: r.fullName }))} />
            <RangeControl value={range} pathname="/issues" searchParams={params} />
          </>
        }
      />
      <div className="space-y-4">
        <MetricStrip className="lg:grid-cols-4">
          <Metric label="Issues opened" value={formatNumber(summary.opened)} hint={`Last ${summary.label}`} />
          <Metric label="Issues closed" value={formatNumber(summary.closed)} hint={`Last ${summary.label}`} />
          <Metric label="Open issues" value={formatNumber(summary.openNow)} hint="All time" />
          <Metric
            label="Median resolution time"
            value={formatDuration(summary.medianHoursToClose)}
            hint={summary.closed ? `Mean ${formatDuration(summary.meanHoursToClose)}` : "No issues closed in range"}
          />
        </MetricStrip>

        <Panel id="issue-chart" title="Issues opened" description={`By ${series.unit}, last ${series.label}`}>
          <ColumnChart data={chart} noun="issue" color="var(--series-3)" height={200} unit={series.unit} emptyText="No issues found for this period." />
        </Panel>

        <Panel
          bodyClassName="p-0"
          title="All issues"
          actions={
            <>
              <SearchInput placeholder="Search titles" />
              <SegmentedLinks label="Status" options={STATES} param="state" value={query.state || ""} pathname="/issues" searchParams={params} />
            </>
          }
        >
          {issues.rows.length === 0 ? (
            <EmptyState title={filtered ? "No issues match these filters." : "No issues found."} description={filtered ? "Try another status or repository." : "Issues you open on GitHub will appear after the next sync."} />
          ) : (
            <>
              <Table label="Issues">
                <thead>
                  <tr>
                    <Th className="hidden sm:table-cell">Repository</Th>
                    <Th>Title</Th>
                    <Th>Status</Th>
                    <Th align="right">Opened</Th>
                    <Th align="right">Closed</Th>
                    <Th align="right"><span className="sr-only">Link</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {issues.rows.map((issue) => (
                    <tr key={issue.id} className="hover:bg-surface-2/60">
                      <Td className="hidden whitespace-nowrap text-xs sm:table-cell">
                        <Link href={`/repositories/${issue.repository.id}`} className="text-fg-2 hover:text-fg hover:underline">{issue.repository.fullName}</Link>
                      </Td>
                      <Td className="min-w-64 sm:min-w-72">
                        <span className="mb-0.5 block text-2xs text-fg-3 sm:hidden">{issue.repository.fullName}</span>
                        <span className="break-words">{issue.title}</span> <span className="tabular text-xs text-fg-3">#{issue.number}</span>
                        {issue.labels.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {issue.labels.slice(0, 4).map((l) => <Badge key={l}>{l}</Badge>)}
                          </div>
                        )}
                      </Td>
                      <Td><IssueState state={issue.state} /></Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{formatDate(issue.openedAt, { tz })}</Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{issue.closedAt ? formatDate(issue.closedAt, { tz }) : "—"}</Td>
                      <Td align="right">
                        {issue.url ? (
                          <a href={issue.url} target="_blank" rel="noreferrer" className="inline-flex text-fg-3 hover:text-fg" aria-label={`Open issue #${issue.number} on GitHub`}>
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
              <Pagination {...issues} pathname="/issues" searchParams={params} noun="issues" />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
