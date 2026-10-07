import { GitHubError } from "./client.js";
import {
  VIEWER_CONTRIBUTION_CALENDAR,
  VIEWER_ISSUES,
  VIEWER_PROFILE,
  VIEWER_PULL_REQUESTS,
  VIEWER_REPOSITORIES,
} from "./queries.js";

// Upper bound per repository per sync, so a single huge repository cannot
// exhaust the hourly API budget. Remaining history is fetched next sync.
export const MAX_COMMITS_PER_REPO = 5000;

export async function fetchViewer(client) {
  const data = await client.graphql(VIEWER_PROFILE);
  return data.viewer;
}

export async function fetchRepositories(client) {
  return client.paginateGraphQL(VIEWER_REPOSITORIES, {}, (data) => data?.viewer?.repositories);
}

export async function fetchContributionCalendar(client, { from, to }) {
  const data = await client.graphql(VIEWER_CONTRIBUTION_CALENDAR, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return data?.viewer?.contributionsCollection?.contributionCalendar || null;
}

/**
 * Pull requests authored by the viewer, newest-updated first.
 * With `updatedSince`, stops at the first PR that hasn't changed since then.
 */
export async function fetchPullRequests(client, { updatedSince } = {}) {
  return client.paginateGraphQL(VIEWER_PULL_REQUESTS, {}, (data) => data?.viewer?.pullRequests, {
    shouldStop: updatedSince ? (node) => new Date(node.updatedAt) < updatedSince : undefined,
  });
}

export async function fetchIssues(client, { updatedSince } = {}) {
  return client.paginateGraphQL(VIEWER_ISSUES, {}, (data) => data?.viewer?.issues, {
    shouldStop: updatedSince ? (node) => new Date(node.updatedAt) < updatedSince : undefined,
  });
}

/**
 * Commits on the default branch authored by `login`.
 * Returns [] for empty repositories (GitHub answers 409).
 */
export async function fetchCommits(client, { fullName, login, since }) {
  try {
    return await client.paginate(
      `/repos/${fullName}/commits`,
      { author: login, since: since?.toISOString() },
      { maxItems: MAX_COMMITS_PER_REPO },
    );
  } catch (error) {
    if (error instanceof GitHubError && error.code === "EMPTY_REPOSITORY") return [];
    throw error;
  }
}
