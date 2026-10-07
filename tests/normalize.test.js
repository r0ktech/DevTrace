import { describe, expect, it } from "vitest";
import {
  normalizeCommit,
  normalizeContributionCalendar,
  normalizeIssue,
  normalizeLanguages,
  normalizeProfile,
  normalizePullRequest,
  normalizeRepository,
} from "@/server/github/normalize";
import { issueNode, prNode, repoNode } from "./helpers/fake-github";

describe("normalizeRepository", () => {
  it("maps GitHub fields to the internal model", () => {
    const repo = normalizeRepository(repoNode(7, "api", { owner: "Octo" }), "octo");
    expect(repo).toMatchObject({
      provider: "github",
      externalId: "7",
      fullName: "Octo/api",
      ownerLogin: "Octo",
      primaryLanguage: "JavaScript",
      stars: 3,
      forks: 1,
      isOwner: true, // owner comparison is case-insensitive
      isAffiliated: true,
      defaultBranch: "main",
      openIssues: 0,
    });
    expect(repo.repoPushedAt).toEqual(new Date("2026-09-01T00:00:00Z"));
  });

  it("marks org repos as not owned and contribution repos as unaffiliated", () => {
    const repo = normalizeRepository(repoNode(8, "lib", { owner: "some-org", issues: undefined }), "octo", { affiliated: false });
    expect(repo.isOwner).toBe(false);
    expect(repo.isAffiliated).toBe(false);
    expect(repo).not.toHaveProperty("openIssues"); // not present in PR/issue payloads
  });

  it("handles missing optional data and null nodes", () => {
    const node = repoNode(9, "empty", { language: null, pushedAt: null, defaultBranchRef: null, description: null });
    const repo = normalizeRepository(node, "octo");
    expect(repo.primaryLanguage).toBeNull();
    expect(repo.repoPushedAt).toBeNull();
    expect(repo.defaultBranch).toBeNull();
    expect(normalizeRepository(null, "octo")).toBeNull();
    expect(normalizeRepository({ ...node, databaseId: null }, "octo")).toBeNull();
  });
});

describe("normalizeLanguages", () => {
  it("drops zero-byte and unnamed languages", () => {
    const node = { languages: { edges: [{ size: 10, node: { name: "Go", color: "#00ADD8" } }, { size: 0, node: { name: "Shell" } }, { size: 5, node: null }] } };
    expect(normalizeLanguages(node)).toEqual([{ language: "Go", bytes: 10, color: "#00ADD8" }]);
    expect(normalizeLanguages({})).toEqual([]);
  });
});

describe("normalizePullRequest", () => {
  const repo = repoNode(1, "api");
  it("derives merged / closed / open state", () => {
    expect(normalizePullRequest(prNode(1, 1, repo, { state: "MERGED" })).state).toBe("merged");
    expect(normalizePullRequest(prNode(2, 2, repo, { state: "CLOSED" })).state).toBe("closed");
    expect(normalizePullRequest(prNode(3, 3, repo, { state: "OPEN" })).state).toBe("open");
  });
  it("keeps the original title and timestamps", () => {
    const pr = normalizePullRequest(prNode(4, 42, repo, { title: "Add authentication system" }));
    expect(pr).toMatchObject({ number: 42, title: "Add authentication system", headRef: "feature/42", externalId: "4" });
    expect(pr.mergedAt).toEqual(new Date("2026-09-02T10:00:00Z"));
  });
});

describe("normalizeIssue", () => {
  it("maps labels and state", () => {
    const issue = normalizeIssue(issueNode(5, 9, repoNode(1, "api"), { state: "OPEN" }));
    expect(issue).toMatchObject({ state: "open", labels: ["bug"], comments: 1, closedAt: null });
  });
});

describe("normalizeCommit", () => {
  it("uses the author date and original message", () => {
    const commit = normalizeCommit({
      sha: "abc",
      html_url: "u",
      author: null,
      commit: { message: "Fix bug\n\nDetails", author: { name: "A", email: "a@x", date: "2026-01-02T03:04:05Z" }, committer: { date: "2026-02-01T00:00:00Z" } },
    });
    expect(commit.message).toBe("Fix bug\n\nDetails");
    expect(commit.committedAt).toEqual(new Date("2026-01-02T03:04:05Z"));
    expect(commit.authorLogin).toBeNull();
  });
  it("rejects commits without a sha or date", () => {
    expect(normalizeCommit({ commit: { author: { date: "2026-01-01" } } })).toBeNull();
    expect(normalizeCommit({ sha: "x", commit: {} })).toBeNull();
  });
});

describe("profile and calendar", () => {
  it("normalizes profile counts", () => {
    const p = normalizeProfile({ databaseId: 1, login: "octo", followers: { totalCount: 3 }, following: { totalCount: 2 }, repositories: { totalCount: 9 } });
    expect(p).toMatchObject({ externalId: "1", login: "octo", followers: 3, publicRepos: 9, profileUrl: "https://github.com/octo" });
  });
  it("flattens contribution weeks into UTC dates", () => {
    const days = normalizeContributionCalendar({ weeks: [{ contributionDays: [{ date: "2026-01-01", contributionCount: 4 }] }] });
    expect(days).toEqual([{ date: new Date("2026-01-01T00:00:00Z"), count: 4 }]);
    expect(normalizeContributionCalendar(null)).toEqual([]);
  });
});
