import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getPullRequestSummary, listPullRequests } from "@/server/analytics/pull-requests";
import { getActivitySeries } from "@/server/analytics/activity";
import { listRepositoryOptions } from "@/server/analytics/repositories";
import { pullRequestsQuery, safeSearchParams } from "@/server/validation";
import { formatDate, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { SegmentedLinks } from "@/components/ui/segmented";
import { RangeControl } from "@/components/app/range-control";
import { ParamSelect } from "@/components/app/repo-select";
import { SearchInput } from "@/components/app/search-input";
import { PullRequestState } from "@/components/app/state-badge";
import { ColumnChart } from "@/components/charts/column-chart";

export const metadata = { title: "Pull Requests" };

const STATES = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "merged", label: "Merged" },
  { value: "closed", label: "Closed" },
];

export default async function PullRequestsPage({ searchParams }) {
  const params = await searchParams;
  const { user, tz, range } = await getPageContext(params);
  const query = safeSearchParams(pullRequestsQuery, params);

  const [summary, prs, repos, series] = await Promise.all([
    getPullRequestSummary(user.id, { range, tz, repositoryId: query.repo }),
    listPullRequests(user.id, { state: query.state, repositoryId: query.repo, search: query.q, page: query.page, pageSize: query.pageSize }),
    listRepositoryOptions(user.id),
    getActivitySeries(user.id, { range, tz, repositoryId: query.repo }),
  ]);
  const chart = series.points.map((p) => ({ key: p.key, value: p.pullRequests }));
  const filtered = Boolean(query.state || query.repo || query.q);

  return (
    <>
      <PageHeader
        title="Pull Requests"
        description="Pull requests you authored, across your repositories and the projects you contribute to."
        actions={
          <>
            <ParamSelect param="repo" value={query.repo} label="Filter by repository" allLabel="All repositories" options={repos.map((r) => ({ value: r.id, label: r.fullName }))} />
            <RangeControl value={range} pathname="/pull-requests" searchParams={params} />
          </>
        }
      />
      <div className="space-y-4">
        <MetricStrip>
          <Metric label="Opened" value={formatNumber(summary.opened)} hint={`Last ${summary.label}`} />
          <Metric label="Merged" value={formatNumber(summary.merged)} hint={summary.mergeRate == null ? "Of PRs opened in range" : `${formatPercent(summary.mergeRate * 100)} merge rate`} />
          <Metric label="Closed" value={formatNumber(summary.closed)} hint="Closed without merging" />
          <Metric label="Open now" value={formatNumber(summary.openNow)} hint="All time" />
          <Metric
            label="Median time to merge"
            value={formatDuration(summary.medianHoursToMerge)}
            hint={summary.mergedInRange ? `${summary.mergedInRange} merged · mean ${formatDuration(summary.meanHoursToMerge)}` : "No merges in range"}
          />
        </MetricStrip>

        <Panel id="pr-chart" title="Pull requests opened" description={`By ${series.unit}, last ${series.label}`}>
          <ColumnChart data={chart} noun="pull request" color="var(--series-2)" height={200} unit={series.unit} emptyText="No pull requests found for this period." />
        </Panel>

        <Panel
          bodyClassName="p-0"
          title="All pull requests"
          actions={
            <>
              <SearchInput placeholder="Search titles" />
              <SegmentedLinks label="Status" options={STATES} param="state" value={query.state || ""} pathname="/pull-requests" searchParams={params} />
            </>
          }
        >
          {prs.rows.length === 0 ? (
            <EmptyState title={filtered ? "No pull requests match these filters." : "No pull requests found."} description={filtered ? "Try another status or repository." : "Pull requests you open on GitHub will appear after the next sync."} />
          ) : (
            <>
              <Table label="Pull requests">
                <thead>
                  <tr>
                    <Th className="hidden sm:table-cell">Repository</Th>
                    <Th>Title</Th>
                    <Th>Status</Th>
                    <Th>Author</Th>
                    <Th align="right">Created</Th>
                    <Th align="right">Merged</Th>
                    <Th align="right"><span className="sr-only">Link</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {prs.rows.map((pr) => (
                    <tr key={pr.id} className="hover:bg-surface-2/60">
                      <Td className="hidden whitespace-nowrap text-xs sm:table-cell">
                        <Link href={`/repositories/${pr.repository.id}`} className="text-fg-2 hover:text-fg hover:underline">{pr.repository.fullName}</Link>
                      </Td>
                      <Td className="min-w-64 sm:min-w-72">
                        <span className="mb-0.5 block text-2xs text-fg-3 sm:hidden">{pr.repository.fullName}</span>
                        <span className="break-words">{pr.title}</span> <span className="tabular text-xs text-fg-3">#{pr.number}</span>
                        {pr.headRef && <div className="mt-0.5 font-mono text-2xs text-fg-3">{pr.headRef} → {pr.baseRef}</div>}
                      </Td>
                      <Td><PullRequestState state={pr.state} isDraft={pr.isDraft} /></Td>
                      <Td className="whitespace-nowrap text-xs text-fg-2">{pr.authorLogin || "—"}</Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{formatDate(pr.openedAt, { tz })}</Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{pr.mergedAt ? formatDate(pr.mergedAt, { tz }) : "—"}</Td>
                      <Td align="right">
                        {pr.url ? (
                          <a href={pr.url} target="_blank" rel="noreferrer" className="inline-flex text-fg-3 hover:text-fg" aria-label={`Open pull request #${pr.number} on GitHub`}>
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
              <Pagination {...prs} pathname="/pull-requests" searchParams={params} noun="pull requests" />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
