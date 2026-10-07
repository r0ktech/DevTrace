import { describe, expect, it, vi } from "vitest";
import { createGitHubClient, getRateLimitReset, GitHubError, parseNextLink, RateLimitError } from "@/server/github/client";

const ok = (body, headers = {}) => new Response(JSON.stringify(body), { status: 200, headers });
const fail = (status, headers = {}, body = { message: "nope" }) => new Response(JSON.stringify(body), { status, headers });

describe("parseNextLink", () => {
  it("extracts the next URL from a Link header", () => {
    const header = '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"';
    expect(parseNextLink(header)).toBe("https://api.github.com/x?page=2");
  });
  it("returns null on the last page", () => {
    expect(parseNextLink('<https://api.github.com/x?page=1>; rel="prev"')).toBeNull();
    expect(parseNextLink(null)).toBeNull();
  });
});

describe("getRateLimitReset", () => {
  it("detects primary rate limits from x-ratelimit headers", () => {
    const res = fail(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "2000000000" });
    expect(getRateLimitReset(res)?.getTime()).toBe(2_000_000_000_000);
  });
  it("detects secondary limits from retry-after", () => {
    const res = fail(429, { "retry-after": "30" });
    expect(getRateLimitReset(res, 1000)?.getTime()).toBe(31_000);
  });
  it("does not treat a plain 403 as a rate limit", () => {
    expect(getRateLimitReset(fail(403))).toBeNull();
  });
});

describe("createGitHubClient", () => {
  it("requires a token", () => {
    expect(() => createGitHubClient(null)).toThrow(GitHubError);
  });

  it("follows Link-header pagination across pages", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ok([1, 2], { link: '<https://api.github.com/items?page=2>; rel="next"' }))
      .mockResolvedValueOnce(ok([3], {}));
    const client = createGitHubClient("t", { fetchImpl });
    expect(await client.paginate("/items")).toEqual([1, 2, 3]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toContain("per_page=100");
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer t");
  });

  it("caps very large histories with maxItems", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => ok([1, 2, 3], { link: '<https://api.github.com/items?page=2>; rel="next"' }));
    const client = createGitHubClient("t", { fetchImpl });
    expect(await client.paginate("/items", {}, { maxItems: 4 })).toEqual([1, 2, 3, 1]);
  });

  it("throws RateLimitError when the reset is far away", async () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    const fetchImpl = vi.fn().mockImplementation(async () => fail(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) }));
    const client = createGitHubClient("t", { fetchImpl, sleep: vi.fn() });
    const error = await client.request("/user").catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.resetAt.getTime()).toBe(reset * 1000);
  });

  it("waits out short secondary rate limits and retries", async () => {
    const sleep = vi.fn().mockResolvedValue();
    const fetchImpl = vi.fn().mockResolvedValueOnce(fail(429, { "retry-after": "2" })).mockResolvedValueOnce(ok({ login: "octo" }));
    const client = createGitHubClient("t", { fetchImpl, sleep });
    expect(await client.request("/user")).toEqual({ login: "octo" });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries transient 5xx errors then gives up with a coded error", async () => {
    const sleep = vi.fn().mockResolvedValue();
    const fetchImpl = vi.fn().mockImplementation(async () => fail(502));
    const client = createGitHubClient("t", { fetchImpl, sleep, maxRetries: 2 });
    const error = await client.request("/user").catch((e) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(error.code).toBe("GITHUB_UNAVAILABLE");
  });

  it("maps 401, 404 and 409 to specific codes", async () => {
    for (const [status, code] of [[401, "UNAUTHORIZED"], [404, "NOT_FOUND"], [409, "EMPTY_REPOSITORY"]]) {
      const client = createGitHubClient("t", { fetchImpl: vi.fn().mockImplementation(async () => fail(status)) });
      expect((await client.request("/x").catch((e) => e)).code).toBe(code);
    }
  });

  it("reports network failures after retrying", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = createGitHubClient("t", { fetchImpl, sleep: vi.fn(), maxRetries: 1 });
    const error = await client.request("/x").catch((e) => e);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("accepts partial GraphQL data but fails when nothing usable returns", async () => {
    const partial = createGitHubClient("t", { fetchImpl: vi.fn().mockResolvedValue(ok({ data: { viewer: { login: "o" } }, errors: [{ type: "FORBIDDEN", message: "SSO" }] })) });
    expect(await partial.graphql("query X { viewer { login } }")).toEqual({ viewer: { login: "o" } });

    const broken = createGitHubClient("t", { fetchImpl: vi.fn().mockResolvedValue(ok({ errors: [{ message: "bad" }] })) });
    expect((await broken.graphql("query X {}").catch((e) => e)).code).toBe("GRAPHQL_ERROR");

    const limited = createGitHubClient("t", { fetchImpl: vi.fn().mockResolvedValue(ok({ errors: [{ type: "RATE_LIMITED", message: "slow down" }] })) });
    expect(await limited.graphql("query X {}").catch((e) => e)).toBeInstanceOf(RateLimitError);
  });

  it("walks GraphQL cursors and stops early for incremental syncs", async () => {
    const pages = [
      { nodes: [{ id: 1, updatedAt: "2026-09-10" }, { id: 2, updatedAt: "2026-09-08" }], pageInfo: { hasNextPage: true, endCursor: "c1" } },
      { nodes: [{ id: 3, updatedAt: "2026-09-05" }, null, { id: 4, updatedAt: "2026-08-01" }], pageInfo: { hasNextPage: true, endCursor: "c2" } },
    ];
    const fetchImpl = vi.fn().mockImplementation(async (_url, init) => {
      const { variables } = JSON.parse(init.body);
      return ok({ data: { list: variables.after === "c1" ? pages[1] : pages[0] } });
    });
    const client = createGitHubClient("t", { fetchImpl });
    const nodes = await client.paginateGraphQL("query Q($after: String) {}", {}, (d) => d.list, {
      shouldStop: (n) => n.updatedAt < "2026-09-01",
    });
    expect(nodes.map((n) => n.id)).toEqual([1, 2, 3]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
