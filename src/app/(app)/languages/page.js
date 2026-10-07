import { ChevronDown } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { getLanguageBreakdown } from "@/server/analytics/languages";
import { withOther } from "@/server/analytics/languages-calc";
import { listRepositoryOptions } from "@/server/analytics/repositories";
import { languagesQuery, safeSearchParams } from "@/server/validation";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ShareBar } from "@/components/charts/share-bar";
import { BarList } from "@/components/charts/bar-list";

export const metadata = { title: "Languages" };

const FALLBACK_COLORS = ["var(--fg-3)", "var(--border-strong)"];

function colorFor(entry, index) {
  if (entry.language === "Other") return "var(--surface-3)";
  return entry.color || FALLBACK_COLORS[index % 2];
}

export default async function LanguagesPage({ searchParams }) {
  const params = await searchParams;
  const { user, prefs } = await getPageContext(params);
  const selected = [].concat(params.r || []).filter(Boolean);
  const query = safeSearchParams(languagesQuery, { scope: params.scope, archived: params.archived, repos: selected.join(",") });
  const scope = query.scope || prefs.defaultRepoScope;

  const [breakdown, repos] = await Promise.all([
    getLanguageBreakdown(user.id, { scope, includeArchived: query.archived === "include", repositoryIds: query.repos }),
    listRepositoryOptions(user.id),
  ]);
  const visibleRepos = repos.filter((r) => !r.removedAt);
  const top = withOther(breakdown.byBytes, 8);
  const commitShare = new Map(breakdown.byCommits.map((c) => [c.language, c]));

  return (
    <>
      <PageHeader title="Languages" description="Based on language usage across your selected repositories." />

      <form method="get" className="mb-4 rounded-md border border-border bg-surface">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Select name="scope" defaultValue={scope} aria-label="Repository scope">
            <option value="all">All repositories</option>
            <option value="owned">Owned only</option>
            <option value="exclude-forks">Exclude forks</option>
          </Select>
          <Select name="archived" defaultValue={query.archived} aria-label="Archived repositories">
            <option value="include">Include archived</option>
            <option value="exclude">Exclude archived</option>
          </Select>
          <details className="group sm:relative">
            <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-md border border-border-strong px-2.5 text-sm text-fg-2 hover:text-fg">
              {selected.length ? `${selected.length} selected repositories` : "Choose repositories"}
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <fieldset className="scrollbar-thin mt-2 max-h-64 overflow-y-auto rounded-md border border-border bg-surface p-2 sm:absolute sm:z-20 sm:w-80">
              <legend className="sr-only">Repositories</legend>
              {visibleRepos.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-[4px] px-1.5 py-1 text-sm hover:bg-surface-2">
                  <input type="checkbox" name="r" value={r.id} defaultChecked={selected.includes(r.id)} className="accent-[var(--accent)]" />
                  <span className="truncate">{r.fullName}</span>
                </label>
              ))}
            </fieldset>
          </details>
          <div className="flex gap-2 sm:ml-auto">
            <Button type="submit" variant="primary">Apply</Button>
            <Button asChild variant="ghost"><a href="/languages">Reset</a></Button>
          </div>
        </div>
      </form>

      {breakdown.repositoryCount === 0 ? (
        <Panel>
          <EmptyState title="You don't have any repositories matching this filter." />
        </Panel>
      ) : breakdown.byBytes.length === 0 ? (
        <Panel>
          <EmptyState title="No language data for these repositories" description="GitHub hasn't reported languages for them, which is typical for empty repositories." />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel
            id="share"
            title="Share of code"
            description={`Bytes of code per language, as measured by GitHub, summed across ${formatNumber(breakdown.repositoryCount)} repositories. This reflects code size, not time spent.`}
          >
            <ShareBar label="Language share of code" items={top.map((e, i) => ({ label: e.language, share: e.share, color: colorFor(e, i) }))} />
            {breakdown.reposWithoutLanguageData > 0 && (
              <p className="mt-3 text-2xs text-fg-3">{breakdown.reposWithoutLanguageData} selected repositories have no language data and are not included.</p>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel id="lang-table" title="Breakdown" className="xl:col-span-2" bodyClassName="p-0">
              <Table label="Languages">
                <thead>
                  <tr>
                    <Th>Language</Th>
                    <Th align="right">Share of code</Th>
                    <Th align="right">Size</Th>
                    <Th align="right">Repositories</Th>
                    <Th align="right">Your commits</Th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.byBytes.map((l, i) => (
                    <tr key={l.language}>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-[2px]" style={{ background: colorFor(l, i) }} aria-hidden="true" />
                          {l.language}
                        </span>
                      </Td>
                      <Td align="right">{formatPercent(l.share * 100, 1)}</Td>
                      <Td align="right" className="text-fg-2">{formatCompact(l.bytes)}B</Td>
                      <Td align="right">{l.repoCount}</Td>
                      <Td align="right">{commitShare.get(l.language) ? formatPercent(commitShare.get(l.language).share * 100, 1) : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
            <Panel
              id="by-commits"
              title="Where your commits go"
              description="Your commits in the last 12 months, attributed to each repository's primary language"
            >
              {breakdown.byCommits.length ? (
                <BarList
                  items={breakdown.byCommits.slice(0, 8).map((c) => ({
                    label: c.language,
                    value: c.commits,
                    display: `${formatPercent(c.share * 100)} · ${formatNumber(c.commits)}`,
                  }))}
                />
              ) : (
                <EmptyState compact title="No commits in these repositories in the last 12 months" />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
