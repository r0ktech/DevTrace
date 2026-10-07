const GITHUB_API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(message, { status, code, path } = {}) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.code = code || "GITHUB_ERROR";
    this.path = path;
  }
}

export class RateLimitError extends GitHubError {
  constructor(message, { resetAt, path } = {}) {
    super(message, { status: 403, code: "RATE_LIMITED", path });
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse an RFC 5988 Link header and return the URL for rel="next".
 */
export function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match && match[2] === "next") return match[1];
  }
  return null;
}

/**
 * Inspect a non-OK response and decide whether it's a rate limit.
 * Returns the Date at which requests may resume, or null.
 */
export function getRateLimitReset(response, now = Date.now()) {
  if (response.status !== 403 && response.status !== 429) return null;
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    return new Date(now + Number(retryAfter) * 1000);
  }
  if (response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    return new Date(Number.isFinite(reset) && reset > 0 ? reset * 1000 : now + 60_000);
  }
  return null;
}

function errorCodeForStatus(status) {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "EMPTY_REPOSITORY";
  if (status === 451) return "UNAVAILABLE";
  if (status >= 500) return "GITHUB_UNAVAILABLE";
  return "GITHUB_ERROR";
}

/**
 * Minimal GitHub REST + GraphQL client.
 *
 * - Follows Link-header pagination
 * - Waits out short rate limits (secondary limits, near-reset windows) and
 *   throws RateLimitError for long ones so the sync job can be rescheduled
 * - Retries transient 5xx / network failures with backoff
 */
export function createGitHubClient(
  token,
  {
    fetchImpl = globalThis.fetch,
    baseUrl = GITHUB_API,
    sleep = defaultSleep,
    maxInlineWaitMs = 60_000,
    maxRetries = 2,
    timeoutMs = 20_000,
  } = {},
) {
  if (!token) throw new GitHubError("Missing GitHub access token", { code: "UNAUTHORIZED" });

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "DevTrace",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function send(url, init, attempt = 0) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...init,
        headers: { ...headers, ...init?.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** attempt);
        return send(url, init, attempt + 1);
      }
      throw new GitHubError(`Could not reach GitHub: ${error.message}`, {
        code: "NETWORK_ERROR",
        path: url,
      });
    }

    if (response.ok) return response;

    const resetAt = getRateLimitReset(response);
    if (resetAt) {
      const waitMs = resetAt.getTime() - Date.now();
      if (waitMs <= maxInlineWaitMs && attempt < maxRetries) {
        await sleep(Math.max(waitMs, 1000));
        return send(url, init, attempt + 1);
      }
      throw new RateLimitError("GitHub rate limit reached", { resetAt, path: url });
    }

    if (response.status >= 500 && attempt < maxRetries) {
      await sleep(500 * 2 ** attempt);
      return send(url, init, attempt + 1);
    }

    let detail = "";
    try {
      const body = await response.json();
      detail = body?.message ? `: ${body.message}` : "";
    } catch {
      // body was not JSON
    }
    throw new GitHubError(`GitHub responded with ${response.status}${detail}`, {
      status: response.status,
      code: errorCodeForStatus(response.status),
      path: url,
    });
  }

  function buildUrl(path, params) {
    const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async function request(path, params) {
    const response = await send(buildUrl(path, params), { method: "GET" });
    return response.json();
  }

  /**
   * Fetch every page of a list endpoint. `maxItems` caps very large histories.
   */
  async function paginate(path, params = {}, { maxItems = Infinity } = {}) {
    const items = [];
    let url = buildUrl(path, { per_page: 100, ...params });
    while (url && items.length < maxItems) {
      const response = await send(url, { method: "GET" });
      const page = await response.json();
      if (!Array.isArray(page) || page.length === 0) break;
      items.push(...page);
      url = parseNextLink(response.headers.get("link"));
    }
    return items.slice(0, maxItems);
  }

  async function graphql(query, variables = {}) {
    const response = await send(`${baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = await response.json();
    if (body.errors?.length) {
      if (body.errors.some((e) => e.type === "RATE_LIMITED")) {
        throw new RateLimitError("GitHub GraphQL rate limit reached", {
          resetAt: new Date(Date.now() + 15 * 60_000),
        });
      }
      // Partial results are normal when some org repos are SSO-protected.
      // Only fail when GitHub returned nothing usable.
      if (!body.data) {
        throw new GitHubError(`GitHub GraphQL error: ${body.errors[0].message}`, {
          code: "GRAPHQL_ERROR",
        });
      }
    }
    return body.data;
  }

  /**
   * Walk a GraphQL connection page by page.
   * `select(data)` returns the connection ({ nodes, pageInfo }).
   * `shouldStop(node)` lets incremental syncs stop once they reach old data.
   */
  async function paginateGraphQL(query, variables, select, { shouldStop, maxItems = Infinity } = {}) {
    const nodes = [];
    let after = null;
    for (;;) {
      const data = await graphql(query, { ...variables, after });
      const connection = select(data);
      if (!connection) break;
      let stopped = false;
      for (const node of connection.nodes || []) {
        if (!node) continue;
        if (shouldStop?.(node)) {
          stopped = true;
          break;
        }
        nodes.push(node);
      }
      if (stopped || !connection.pageInfo?.hasNextPage || nodes.length >= maxItems) break;
      after = connection.pageInfo.endCursor;
    }
    return nodes.slice(0, maxItems);
  }

  return { request, paginate, graphql, paginateGraphQL };
}
