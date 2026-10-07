// In-memory stand-in for the GitHub REST + GraphQL APIs, used to run the
// real sync pipeline in tests. Supports Link-header and cursor pagination,
// `since` filtering, empty repositories and injected failures.

function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export function repoNode(id, name, { owner = "octo", language = "JavaScript", pushedAt = "2026-09-01T00:00:00Z", languages = { JavaScript: 1000 }, ...rest } = {}) {
  return {
    databaseId: id,
    name,
    nameWithOwner: `${owner}/${name}`,
    owner: { login: owner },
    description: `${name} description`,
    url: `https://github.com/${owner}/${name}`,
    homepageUrl: null,
    primaryLanguage: language ? { name: language } : null,
    stargazerCount: 3,
    forkCount: 1,
    diskUsage: 120,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    createdAt: "2025-01-01T00:00:00Z",
    pushedAt,
    defaultBranchRef: { name: "main" },
    issues: { totalCount: 0 },
    languages: { edges: Object.entries(languages).map(([n, size]) => ({ size, node: { name: n, color: "#f1e05a" } })) },
    ...rest,
  };
}

export function commitItem(sha, date, message = `commit ${sha}`) {
  return {
    sha,
    html_url: `https://github.com/x/y/commit/${sha}`,
    author: { login: "octo" },
    commit: { message, author: { name: "Octo", email: "octo@example.test", date }, committer: { date } },
  };
}

export function prNode(id, number, repo, { state = "MERGED", createdAt = "2026-09-01T10:00:00Z", mergedAt = "2026-09-02T10:00:00Z", updatedAt, title } = {}) {
  return {
    databaseId: id,
    number,
    title: title || `PR ${number}`,
    state,
    isDraft: false,
    url: `https://github.com/${repo.nameWithOwner}/pull/${number}`,
    createdAt,
    updatedAt: updatedAt || mergedAt || createdAt,
    mergedAt: state === "MERGED" ? mergedAt : null,
    closedAt: state === "OPEN" ? null : mergedAt,
    additions: 10,
    deletions: 2,
    changedFiles: 1,
    headRefName: `feature/${number}`,
    baseRefName: "main",
    author: { login: "octo" },
    repository: repo,
  };
}

export function issueNode(id, number, repo, { state = "CLOSED", createdAt = "2026-09-01T10:00:00Z", closedAt = "2026-09-03T10:00:00Z", updatedAt } = {}) {
  return {
    databaseId: id,
    number,
    title: `Issue ${number}`,
    state,
    url: `https://github.com/${repo.nameWithOwner}/issues/${number}`,
    createdAt,
    updatedAt: updatedAt || closedAt || createdAt,
    closedAt: state === "CLOSED" ? closedAt : null,
    author: { login: "octo" },
    comments: { totalCount: 1 },
    labels: { nodes: [{ name: "bug" }] },
    repository: repo,
  };
}

export function createFakeGitHub({
  login = "octo",
  viewerId = 42,
  repos = [],
  commits = {},
  pullRequests = [],
  issues = [],
  contributions = [],
  emptyRepos = [],
  missingRepos = [],
  pageSize = 2,
  failWith,
} = {}) {
  const calls = [];

  function connection(nodes, after) {
    const start = after ? Number(after) : 0;
    const page = nodes.slice(start, start + pageSize);
    const end = start + page.length;
    return { nodes: page, pageInfo: { hasNextPage: end < nodes.length, endCursor: String(end) } };
  }

  async function fetchImpl(input, init = {}) {
    const url = new URL(input);
    calls.push({ method: init.method || "GET", path: url.pathname, search: url.search, body: init.body });

    if (failWith) {
      const response = failWith({ url, init });
      if (response) return response;
    }

    if (url.pathname === "/graphql") {
      const { query, variables } = JSON.parse(init.body);
      const op = query.match(/query (\w+)/)[1];
      if (op === "ViewerProfile") {
        return json({ data: { viewer: { databaseId: viewerId, login, name: "Octo Cat", avatarUrl: "https://avatars.githubusercontent.com/u/42", url: `https://github.com/${login}`, createdAt: "2020-01-01T00:00:00Z", followers: { totalCount: 5 }, following: { totalCount: 1 }, repositories: { totalCount: repos.length } } } });
      }
      if (op === "ViewerRepositories") return json({ data: { viewer: { repositories: connection(repos, variables.after) } } });
      if (op === "ViewerPullRequests") return json({ data: { viewer: { pullRequests: connection(pullRequests, variables.after) } } });
      if (op === "ViewerIssues") return json({ data: { viewer: { issues: connection(issues, variables.after) } } });
      if (op === "ViewerContributions") {
        const total = contributions.reduce((t, d) => t + d.contributionCount, 0);
        return json({ data: { viewer: { contributionsCollection: { contributionCalendar: { totalContributions: total, weeks: [{ contributionDays: contributions }] } } } } });
      }
      return json({ errors: [{ message: `Unknown op ${op}` }] }, { status: 200 });
    }

    const match = url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/commits$/);
    if (match) {
      const fullName = match[1];
      if (missingRepos.includes(fullName)) return json({ message: "Not Found" }, { status: 404 });
      if (emptyRepos.includes(fullName)) return json({ message: "Git Repository is empty." }, { status: 409 });
      const since = url.searchParams.get("since");
      const perPage = Number(url.searchParams.get("per_page") || 30);
      const page = Number(url.searchParams.get("page") || 1);
      const all = (commits[fullName] || []).filter((c) => !since || c.commit.author.date >= since);
      const slice = all.slice((page - 1) * perPage, page * perPage);
      const headers = {};
      if (page * perPage < all.length) {
        const next = new URL(url);
        next.searchParams.set("page", String(page + 1));
        headers.link = `<${next}>; rel="next"`;
      }
      return json(slice, { headers });
    }

    return json({ message: "Not Found" }, { status: 404 });
  }

  return { fetchImpl, calls };
}
