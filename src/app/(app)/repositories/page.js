import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { getPageContext } from "@/server/page-context";
import { listRepositories, listRepositoryLanguages } from "@/server/analytics/repositories";
import { repositoryListQuery, safeSearchParams } from "@/server/validation";
import { formatCompact, formatRelative } from "@/lib/format";
import { hrefWith } from "@/lib/url";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { SearchInput } from "@/components/app/search-input";
import { ParamSelect } from "@/components/app/repo-select";
import { LanguageLabel, RepoFlags } from "@/components/app/repo-meta";

export const metadata = { title: "Repositories" };

const TYPE_OPTIONS = [
  { value: "all", label: "All repositories" },
  { value: "owned", label: "Owned" },
  { value: "exclude-forks", label: "Exclude forks" },
  { value: "forks", label: "Forks" },
  { value: "archived", label: "Archived" },
  { value: "active", label: "Active (90 days)" },
  { value: "contributed", label: "External contributions" },
];

const COLUMNS = [
  { key: "name", label: "Repository" },
  { key: "language", label: "Language" },
  { key: "stars", label: "Stars", align: "right" },
  { key: "forks", label: "Forks", align: "right" },
  { key: "commits", label: "Commits", align: "right" },
  { key: "prs", label: "PRs", align: "right" },
  { key: "issues", label: "Issues", align: "right" },
  { key: "activity", label: "Last activity", align: "right" },
];

export default async function RepositoriesPage({ searchParams }) {
  const params = await searchParams;
  const { user, prefs } = await getPageContext(params);
  const query = safeSearchParams(repositoryListQuery, { type: prefs.defaultRepoScope, ...params });
  const [result, languages] = await Promise.all([
    listRepositories(user.id, { ...query, search: query.q }),
    listRepositoryLanguages(user.id),
  ]);
  const filtered = Boolean(query.q || query.language || query.type !== "all");

  return (
    <>
      <PageHeader title="Repositories" description="Repositories you own, collaborate on, or have contributed to. Counts are your own commits, pull requests and issues." />
      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput placeholder="Search repositories" />
          <div className="flex gap-2">
            <ParamSelect param="type" value={query.type} label="Repository type" options={TYPE_OPTIONS} className="flex-1 sm:flex-none" />
            <ParamSelect
              param="language"
              value={query.language}
              label="Language"
              allLabel="All languages"
              options={languages.map((l) => ({ value: l, label: l }))}
              className="flex-1 sm:flex-none"
            />
          </div>
        </div>

        {result.rows.length === 0 ? (
          <EmptyState
            title={filtered ? "You don't have any repositories matching this filter." : "No repositories synced yet"}
            description={filtered ? "Try a different search, type or language." : "Run a sync to import your GitHub repositories."}
          />
        ) : (
          <>
            <Table label="Repositories">
              <thead>
                <tr>
                  {COLUMNS.map((col) => {
                    const active = query.sort === col.key;
                    return (
                      <Th key={col.key} align={col.align} aria-sort={active ? (col.key === "name" || col.key === "language" ? "ascending" : "descending") : undefined}>
                        <Link
                          href={hrefWith("/repositories", params, { sort: col.key })}
                          scroll={false}
                          className={cn("inline-flex items-center gap-1 hover:text-fg", active && "text-fg")}
                        >
                          {col.label}
                          {active && <ArrowDown className={cn("h-3 w-3", (col.key === "name" || col.key === "language") && "rotate-180")} aria-hidden="true" />}
                        </Link>
                      </Th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((repo) => (
                  <tr key={repo.id} className="group transition-colors hover:bg-surface-2/60">
                    <Td className="min-w-64 max-w-md">
                      <Link href={`/repositories/${repo.id}`} className="font-medium hover:underline">
                        {repo.fullName}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <RepoFlags repo={repo} />
                      </div>
                      {repo.description && <p className="mt-1 line-clamp-1 text-xs text-fg-3">{repo.description}</p>}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-fg-2"><LanguageLabel language={repo.primaryLanguage} /></Td>
                    <Td align="right">{formatCompact(repo.stars)}</Td>
                    <Td align="right">{formatCompact(repo.forks)}</Td>
                    <Td align="right">{formatCompact(repo.commits)}</Td>
                    <Td align="right">{formatCompact(repo.prs)}</Td>
                    <Td align="right">{formatCompact(repo.issues)}</Td>
                    <Td align="right" className="whitespace-nowrap text-xs text-fg-2">{formatRelative(repo.lastActivity)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination {...result} pathname="/repositories" searchParams={params} noun="repositories" />
          </>
        )}
      </Panel>
    </>
  );
}
