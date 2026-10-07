// Language aggregation. GitHub reports bytes of code per language for each
// repository (via linguist). We sum bytes across the selected repositories,
// which reflects code size, not time spent. Commit-weighted shares use the
// primary language of the repository each commit belongs to.

export function aggregateLanguageBytes(stats) {
  const byLanguage = new Map();
  for (const stat of stats) {
    const entry = byLanguage.get(stat.language) || { language: stat.language, bytes: 0, repos: new Set(), color: stat.color };
    entry.bytes += Number(stat.bytes) || 0;
    entry.repos.add(stat.repositoryId);
    entry.color = entry.color || stat.color;
    byLanguage.set(stat.language, entry);
  }
  const total = [...byLanguage.values()].reduce((t, e) => t + e.bytes, 0);
  return [...byLanguage.values()]
    .map((e) => ({ language: e.language, bytes: e.bytes, repoCount: e.repos.size, color: e.color || null, share: total ? e.bytes / total : 0 }))
    .sort((a, b) => b.bytes - a.bytes || a.language.localeCompare(b.language));
}

export function aggregateLanguageCommits(rows) {
  const filtered = rows.filter((r) => r.language && Number(r.commits) > 0);
  const total = filtered.reduce((t, r) => t + Number(r.commits), 0);
  return filtered
    .map((r) => ({ language: r.language, commits: Number(r.commits), share: total ? Number(r.commits) / total : 0 }))
    .sort((a, b) => b.commits - a.commits);
}

/** Keep the top `limit` entries and fold the rest into "Other". */
export function withOther(entries, limit, valueKey = "bytes") {
  if (entries.length <= limit) return entries;
  const head = entries.slice(0, limit);
  const tail = entries.slice(limit);
  const other = {
    language: "Other",
    [valueKey]: tail.reduce((t, e) => t + e[valueKey], 0),
    share: tail.reduce((t, e) => t + e.share, 0),
    repoCount: null,
    color: null,
    languages: tail.map((e) => e.language),
  };
  return [...head, other];
}
