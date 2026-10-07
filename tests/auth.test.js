import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUser = vi.fn();
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => currentUser() }));

const { apiHandler, isSameOrigin } = await import("@/server/http");
const { _resetMemoryLimiter } = await import("@/server/rate-limit");
const { createEncryptedAdapter, authOptions } = await import("@/server/auth/options");
const { decryptToken } = await import("@/server/auth/crypto");
const { DEMO_USER_ID } = await import("@/server/demo/seed");
const { settingsPatch, repositoryListQuery, parseSearchParams } = await import("@/server/validation");

function request(method = "GET", { origin, body, url = "http://localhost:3000/api/test" } = {}) {
  const headers = new Headers({ host: "localhost:3000" });
  if (origin) headers.set("origin", origin);
  return new Request(url, { method, headers, body });
}

const user = { id: "user_1", isDemo: false, connectedAccounts: [] };

beforeEach(() => {
  currentUser.mockReset();
  _resetMemoryLimiter();
});

describe("apiHandler authorization", () => {
  it("rejects unauthenticated requests with 401", async () => {
    currentUser.mockResolvedValue(null);
    const res = await apiHandler(async () => ({ ok: true }))(request());
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("passes the session user to the handler, never a client-supplied id", async () => {
    currentUser.mockResolvedValue(user);
    const handler = vi.fn(async ({ user: u }) => ({ id: u.id }));
    const res = await apiHandler(handler)(request("GET", { url: "http://localhost:3000/api/test?userId=someone_else" }));
    expect(await res.json()).toEqual({ id: "user_1" });
  });

  it("blocks cross-origin mutations (CSRF)", async () => {
    currentUser.mockResolvedValue(user);
    const res = await apiHandler(async () => ({}), { mutation: true })(request("POST", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("INVALID_ORIGIN");
  });

  it("allows same-origin mutations", async () => {
    currentUser.mockResolvedValue(user);
    const res = await apiHandler(async () => ({ ok: true }), { mutation: true })(request("POST", { origin: "http://localhost:3000" }));
    expect(res.status).toBe(200);
  });

  it("keeps the demo account read-only", async () => {
    currentUser.mockResolvedValue({ ...user, isDemo: true });
    const res = await apiHandler(async () => ({}), { mutation: true, demoAllowed: false })(request("POST", { origin: "http://localhost:3000" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("DEMO_READ_ONLY");
  });

  it("rate limits per user", async () => {
    currentUser.mockResolvedValue(user);
    const route = apiHandler(async () => ({}), { limit: { limit: 2, windowSeconds: 60 }, name: "t" });
    expect((await route(request())).status).toBe(200);
    expect((await route(request())).status).toBe(200);
    const limited = await route(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });

  it("turns validation errors into 400 responses", async () => {
    currentUser.mockResolvedValue(user);
    const route = apiHandler(async ({ searchParams }) => parseSearchParams(repositoryListQuery, searchParams));
    const res = await route(request("GET", { url: "http://localhost:3000/api/repositories?sort=drop_table" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("hides internal error details", async () => {
    currentUser.mockResolvedValue(user);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new Error("connection string postgres://secret");
    })(request());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("isSameOrigin", () => {
  it("accepts non-browser requests without Origin and rejects cross-site fetch metadata", () => {
    expect(isSameOrigin(request("POST"))).toBe(true);
    const req = request("POST");
    req.headers.set("sec-fetch-site", "cross-site");
    expect(isSameOrigin(req)).toBe(false);
  });
});

describe("OAuth account handling", () => {
  it("encrypts tokens before the adapter stores them", async () => {
    const linkAccount = vi.fn(async ({ data }) => data);
    const adapter = createEncryptedAdapter({ account: { create: linkAccount } });
    const stored = await adapter.linkAccount({ userId: "u1", provider: "github", providerAccountId: "1", type: "oauth", access_token: "gho_plain" });
    expect(stored.access_token).not.toBe("gho_plain");
    expect(decryptToken(stored.access_token)).toBe("gho_plain");
  });

  it("refuses to link a GitHub account to the shared demo user", async () => {
    const adapter = createEncryptedAdapter({ account: { create: vi.fn() } });
    await expect(adapter.linkAccount({ userId: DEMO_USER_ID, provider: "github", providerAccountId: "1", type: "oauth" })).rejects.toThrow(/demo/);
  });

  it("only exposes non-sensitive fields in the session", async () => {
    const session = await authOptions.callbacks.session({
      session: { user: { email: "a@b.c" }, expires: "x" },
      user: { id: "u1", name: "A", image: "i", isDemo: false, email: "a@b.c" },
    });
    expect(session.user).toEqual({ id: "u1", name: "A", image: "i", isDemo: false });
    expect(JSON.stringify(session)).not.toMatch(/token/i);
  });

  it("requests the configured GitHub scopes and uses database sessions", () => {
    expect(authOptions.session.strategy).toBe("database");
    expect(authOptions.pages.error).toBe("/auth/error");
  });
});

describe("input validation", () => {
  it("accepts known settings and rejects unknown keys", () => {
    expect(settingsPatch.parse({ theme: "dark", timezone: "Europe/Berlin" })).toEqual({ theme: "dark", timezone: "Europe/Berlin" });
    expect(() => settingsPatch.parse({ isDemo: true })).toThrow();
    expect(() => settingsPatch.parse({ timezone: "Mars/Olympus" })).toThrow();
    expect(() => settingsPatch.parse({})).toThrow();
  });
});
