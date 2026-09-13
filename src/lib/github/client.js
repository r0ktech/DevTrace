import { Octokit } from '@octokit/rest';

/**
 * Create an authenticated Octokit client for a user.
 * @param {string} accessToken - GitHub OAuth access token
 * @returns {Octokit}
 */
export function createGitHubClient(accessToken) {
  return new Octokit({
    auth: accessToken,
    request: {
      timeout: 10000,
    },
  });
}

/**
 * Fetch all pages of a paginated GitHub API endpoint.
 * @param {Octokit} octokit
 * @param {string} method - e.g. 'repos.listForAuthenticatedUser'
 * @param {object} params
 * @returns {Promise<Array>}
 */
export async function fetchAllPages(octokit, method, params = {}) {
  const items = [];
  const perPage = params.per_page || 100;
  let page = 1;

  while (true) {
    const methodParts = method.split('.');
    let fn = octokit;
    for (const part of methodParts) {
      fn = fn[part];
    }

    const response = await fn({
      ...params,
      per_page: perPage,
      page,
    });

    const data = response.data;
    if (!Array.isArray(data) || data.length === 0) break;

    items.push(...data);

    if (data.length < perPage) break;
    page++;
  }

  return items;
}

/**
 * Check rate limit status and wait if needed.
 * @param {Octokit} octokit
 * @returns {Promise<{remaining: number, limit: number, resetAt: Date}>}
 */
export async function checkRateLimit(octokit) {
  const { data } = await octokit.rateLimit.get();
  const core = data.resources.core;
  return {
    remaining: core.remaining,
    limit: core.limit,
    resetAt: new Date(core.reset * 1000),
  };
}

/**
 * Wait until rate limit resets if we're running low.
 * @param {Octokit} octokit
 * @param {number} threshold - minimum remaining requests before waiting
 */
export async function waitForRateLimit(octokit, threshold = 10) {
  const { remaining, resetAt } = await checkRateLimit(octokit);

  if (remaining <= threshold) {
    const waitMs = Math.max(resetAt.getTime() - Date.now(), 0) + 1000;
    console.log(`Rate limit low (${remaining} remaining). Waiting ${Math.round(waitMs / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/**
 * Fetch authenticated user profile.
 * @param {Octokit} octokit
 * @returns {Promise<object>}
 */
export async function fetchUser(octokit) {
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

/**
 * Fetch all repositories for the authenticated user.
 * @param {Octokit} octokit
 * @returns {Promise<Array>}
 */
export async function fetchRepositories(octokit) {
  return fetchAllPages(octokit, 'repos.listForAuthenticatedUser', {
    sort: 'pushed',
    direction: 'desc',
    per_page: 100,
    affiliation: 'owner,collaborator,organization_member',
  });
}

/**
 * Fetch commits for a repository.
 * @param {Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function fetchCommits(octokit, owner, repo, options = {}) {
  try {
    return await fetchAllPages(octokit, 'repos.listCommits', {
      owner,
      repo,
      per_page: 100,
      ...options,
    });
  } catch (error) {
    if (error.status === 409) {
      // Empty repository
      return [];
    }
    throw error;
  }
}

/**
 * Fetch pull requests for a repository.
 * @param {Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function fetchPullRequests(octokit, owner, repo, options = {}) {
  return fetchAllPages(octokit, 'pulls.list', {
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
    ...options,
  });
}

/**
 * Fetch issues for a repository (excludes pull requests).
 * @param {Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function fetchIssues(octokit, owner, repo, options = {}) {
  const allIssues = await fetchAllPages(octokit, 'issues.listForRepo', {
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
    ...options,
  });

  // GitHub's issues endpoint includes PRs — filter them out
  return allIssues.filter((issue) => !issue.pull_request);
}

/**
 * Fetch language breakdown for a repository.
 * @param {Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object>} - { language: bytes }
 */
export async function fetchLanguages(octokit, owner, repo) {
  const { data } = await octokit.repos.listLanguages({ owner, repo });
  return data;
}
