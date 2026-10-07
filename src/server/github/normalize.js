// Pure functions that map GitHub API payloads onto DevTrace's internal
// model. No database access here so they can be unit tested directly.

const toDate = (value) => (value ? new Date(value) : null);

export function normalizeProfile(viewer) {
  return {
    provider: "github",
    externalId: String(viewer.databaseId),
    login: viewer.login,
    name: viewer.name || null,
    avatarUrl: viewer.avatarUrl || null,
    bio: viewer.bio || null,
    company: viewer.company || null,
    location: viewer.location || null,
    blog: viewer.websiteUrl || null,
    profileUrl: viewer.url || `https://github.com/${viewer.login}`,
    publicRepos: viewer.repositories?.totalCount ?? 0,
    followers: viewer.followers?.totalCount ?? 0,
    following: viewer.following?.totalCount ?? 0,
    accountCreatedAt: toDate(viewer.createdAt),
  };
}

/**
 * @param {object} node GraphQL Repository node
 * @param {string} viewerLogin
 * @param {{ affiliated: boolean }} options affiliated=false for repos only
 *   discovered through the user's pull requests or issues
 */
export function normalizeRepository(node, viewerLogin, { affiliated = true } = {}) {
  if (!node || node.databaseId == null) return null;
  const ownerLogin = node.owner?.login || node.nameWithOwner.split("/")[0];
  const repo = {
    provider: "github",
    externalId: String(node.databaseId),
    ownerLogin,
    name: node.name,
    fullName: node.nameWithOwner,
    description: node.description || null,
    url: node.url || null,
    homepage: node.homepageUrl || null,
    primaryLanguage: node.primaryLanguage?.name || null,
    stars: node.stargazerCount ?? 0,
    forks: node.forkCount ?? 0,
    sizeKb: node.diskUsage ?? 0,
    isPrivate: Boolean(node.isPrivate),
    isFork: Boolean(node.isFork),
    isArchived: Boolean(node.isArchived),
    isOwner: ownerLogin.toLowerCase() === String(viewerLogin).toLowerCase(),
    isAffiliated: affiliated,
    defaultBranch: node.defaultBranchRef?.name || null,
    repoCreatedAt: toDate(node.createdAt),
    repoPushedAt: toDate(node.pushedAt),
  };
  if (node.issues) repo.openIssues = node.issues.totalCount ?? 0;
  return repo;
}

export function normalizeLanguages(node) {
  const edges = node?.languages?.edges || [];
  return edges
    .filter((edge) => edge?.node?.name && edge.size > 0)
    .map((edge) => ({ language: edge.node.name, bytes: edge.size, color: edge.node.color || null }));
}

export function normalizeContributionCalendar(calendar) {
  const days = [];
  for (const week of calendar?.weeks || []) {
    for (const day of week.contributionDays || []) {
      days.push({ date: new Date(`${day.date}T00:00:00.000Z`), count: day.contributionCount });
    }
  }
  return days;
}

/**
 * GitHub's commit list returns the author date (when the change was made)
 * and the committer date (when it was applied). We use the author date.
 */
export function normalizeCommit(item) {
  const commit = item.commit || {};
  const date = commit.author?.date || commit.committer?.date;
  if (!item.sha || !date) return null;
  return {
    sha: item.sha,
    message: commit.message ?? "",
    authorName: commit.author?.name || null,
    authorEmail: commit.author?.email || null,
    authorLogin: item.author?.login || null,
    committedAt: new Date(date),
    url: item.html_url || null,
  };
}

export function normalizePullRequestState(node) {
  if (node.mergedAt || node.state === "MERGED") return "merged";
  if (node.state === "CLOSED") return "closed";
  return "open";
}

export function normalizePullRequest(node) {
  if (!node || node.databaseId == null) return null;
  return {
    externalId: String(node.databaseId),
    number: node.number,
    title: node.title,
    state: normalizePullRequestState(node),
    isDraft: Boolean(node.isDraft),
    authorLogin: node.author?.login || null,
    url: node.url || null,
    additions: node.additions ?? null,
    deletions: node.deletions ?? null,
    changedFiles: node.changedFiles ?? null,
    headRef: node.headRefName || null,
    baseRef: node.baseRefName || null,
    openedAt: new Date(node.createdAt),
    mergedAt: toDate(node.mergedAt),
    closedAt: toDate(node.closedAt),
    remoteUpdatedAt: toDate(node.updatedAt),
  };
}

export function normalizeIssue(node) {
  if (!node || node.databaseId == null) return null;
  return {
    externalId: String(node.databaseId),
    number: node.number,
    title: node.title,
    state: node.state === "CLOSED" ? "closed" : "open",
    authorLogin: node.author?.login || null,
    labels: (node.labels?.nodes || []).map((label) => label?.name).filter(Boolean),
    comments: node.comments?.totalCount ?? 0,
    url: node.url || null,
    openedAt: new Date(node.createdAt),
    closedAt: toDate(node.closedAt),
    remoteUpdatedAt: toDate(node.updatedAt),
  };
}
