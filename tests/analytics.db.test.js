import { beforeEach, describe, expect, it } from "vitest";
import { getActivitySeries, getCommitRhythm, getEvents, getHeatmap } from "@/server/analytics/activity";
import { getOverviewMetrics, getTopRepositories } from "@/server/analytics/overview";
import { getRepository, listRepositories } from "@/server/analytics/repositories";
import { getCommitSummary, listCommits } from "@/server/analytics/commits";
import { getPullRequestSummary, listPullRequests } from "@/server/analytics/pull-requests";
import { getIssueSummary, listIssues } from "@/server/analytics/issues";
import { getLanguageBreakdown } from "@/server/analytics/languages";
import { getInsights } from "@/server/analytics/insights";
import { getProfile } from "@/server/analytics/profile";
import { createRepository, createUser, prisma, resetDatabase } from "./helpers/db";

const NOW = new Date("2026-10-06T12:00:00Z");
const at = (iso) => new Date(iso);

async function seedUser(login) {
  const user = await createUser({ login });
  await prisma.connectedAccount.create({ data: { userId: user.id, provider: "github", externalId: `ext-${login}`, login } });
  const repo = await createRepository(user.id, { name: `${login}-main`, fullName: `${login}/main`, primaryLanguage: "Go" });
  const priv = await createRepository(user.id, { name: `${login}-secret`, fullName: `${login}/secret`, isPrivate: true, primaryLanguage: "Rust" });
  await prisma.commit.createMany({
    data: [
      { userId: user.id, repositoryId: repo.id, sha: `${login}1`, message: "Add parser\n\nbody", committedAt: at("2026-10-05T14:10:00Z") },
      { userId: user.id, repositoryId: repo.id, sha: `${login}2`, message: "Fix lexer", committedAt: at("2026-10-05T15:20:00Z") },
      { userId: user.id, repositoryId: priv.id, sha: `${login}3`, message: "Secret work", committedAt: at("2026-10-01T23:30:00Z") },
      { userId: user.id, repositoryId: repo.id, sha: `${login}4`, message: "Old commit", committedAt: at("2026-08-20T10:00:00Z") },
    ],
  });
  await prisma.pullRequest.createMany({
    data: [
      { userId: user.id, repositoryId: repo.id, externalId: `${login}p1`, number: 1, title: "Parser", state: "merged", openedAt: at("2026-10-01T10:00:00Z"), mergedAt: at("2026-10-01T16:00:00Z"), closedAt: at("2026-10-01T16:00:00Z") },
      { userId: user.id, repositoryId: repo.id, externalId: `${login}p2`, number: 2, title: "Lexer", state: "open", openedAt: at("2026-10-04T10:00:00Z") },
      { userId: user.id, repositoryId: repo.id, externalId: `${login}p3`, number: 3, title: "Abandoned", state: "closed", openedAt: at("2026-09-28T10:00:00Z"), closedAt: at("2026-09-29T10:00:00Z") },
    ],
  });
  await prisma.issue.createMany({
    data: [
      { userId: user.id, repositoryId: repo.id, externalId: `${login}i1`, number: 10, title: "Crash on empty input", state: "closed", openedAt: at("2026-10-02T09:00:00Z"), closedAt: at("2026-10-04T09:00:00Z") },
      { userId: user.id, repositoryId: priv.id, externalId: `${login}i2`, number: 11, title: "Private issue", state: "open", openedAt: at("2026-10-03T09:00:00Z") },
    ],
  });
  await prisma.languageStat.createMany({
    data: [
      { repositoryId: repo.id, language: "Go", bytes: 300 },
      { repositoryId: priv.id, language: "Rust", bytes: 100 },
    ],
  });
  return { user, repo, priv };
}

let alice;
let bob;

beforeEach(async () => {
  await resetDatabase();
  alice = await seedUser("alice");
  bob = await seedUser("bob");
});

describe("aggregations come from the database", () => {
  it("counts overview metrics for the range and previous period", async () => {
    const m = await getOverviewMetrics(alice.user.id, { range: "7d", tz: "UTC", now: NOW });
    expect(m.commits).toEqual({ current: 3, previous: 0 });
    expect(m.pullRequests).toEqual({ current: 2, previous: 1 });
    expect(m.issues.current).toBe(2);
    expect(m.activeRepositories.current).toBe(2);
    expect(m.totalRepositories).toBe(2);
    expect(m.contributions.available).toBe(false);
  });

  it("buckets activity by day in the user's timezone", async () => {
    const utc = await getActivitySeries(alice.user.id, { range: "7d", tz: "UTC", now: NOW });
    expect(utc.points).toHaveLength(7);
    expect(utc.points.find((p) => p.key === "2026-10-01").commits).toBe(1);
    expect(utc.totals).toEqual({ commits: 3, pullRequests: 2, issues: 2 });

    // 23:30 UTC on Oct 1 is Oct 2 in Tokyo
    const tokyo = await getActivitySeries(alice.user.id, { range: "7d", tz: "Asia/Tokyo", now: NOW });
    expect(tokyo.points.find((p) => p.key === "2026-10-02").commits).toBe(1);
  });

  it("filters series by repository", async () => {
    const s = await getActivitySeries(alice.user.id, { range: "7d", tz: "UTC", now: NOW, repositoryId: alice.priv.id });
    expect(s.totals).toEqual({ commits: 1, pullRequests: 0, issues: 1 });
  });

  it("falls back to DevTrace activity for the heatmap without a contribution calendar", async () => {
    const h = await getHeatmap(alice.user.id, { period: "3m", tz: "UTC", now: NOW });
    expect(h.source).toBe("devtrace");
    expect(h.total).toBe(4 + 3 + 2);
    await prisma.contributionDay.create({ data: { userId: alice.user.id, date: at("2026-10-05T00:00:00Z"), count: 7 } });
    const withCalendar = await getHeatmap(alice.user.id, { period: "3m", tz: "UTC", now: NOW });
    expect(withCalendar).toMatchObject({ source: "github", total: 7 });
  });

  it("computes commit rhythm by weekday and hour", async () => {
    const r = await getCommitRhythm(alice.user.id, { since: at("2026-09-29T00:00:00Z"), tz: "UTC" });
    expect(r.total).toBe(3);
    expect(r.matrix[0][14]).toBe(1); // Monday Oct 5, 14:00
    expect(r.hours[23]).toBe(1);
  });

  it("ranks top repositories by activity", async () => {
    const top = await getTopRepositories(alice.user.id, { range: "30d", tz: "UTC", now: NOW });
    expect(top[0]).toMatchObject({ fullName: "alice/main", commits: 2, prs: 3, issues: 1, activeDays: 1 });
  });

  it("summarizes commits, PRs and issues", async () => {
    const commits = await getCommitSummary(alice.user.id, { range: "30d", tz: "UTC", now: NOW });
    expect(commits).toMatchObject({ total: 4, thisMonth: 3, inRange: 3, busiestDay: 0, busiestHour: 14 });

    const prs = await getPullRequestSummary(alice.user.id, { range: "30d", tz: "UTC", now: NOW });
    expect(prs).toMatchObject({ opened: 3, merged: 1, closed: 1, open: 1, openNow: 1, medianHoursToMerge: 6, mergeRate: 0.5 });

    const issues = await getIssueSummary(alice.user.id, { range: "30d", tz: "UTC", now: NOW });
    expect(issues).toMatchObject({ opened: 2, closed: 1, openNow: 1, medianHoursToClose: 48 });
  });

  it("lists, searches and paginates tables", async () => {
    expect((await listCommits(alice.user.id, { search: "LEXER" })).rows.map((c) => c.sha)).toEqual(["alice2"]);
    const page = await listCommits(alice.user.id, { page: 2, pageSize: 3 });
    expect(page).toMatchObject({ total: 4, pageCount: 2 });
    expect(page.rows).toHaveLength(1);
    expect((await listPullRequests(alice.user.id, { state: "merged" })).rows.map((p) => p.number)).toEqual([1]);
    expect((await listIssues(alice.user.id, { state: "open" })).total).toBe(1);
  });

  it("filters and sorts repositories", async () => {
    const all = await listRepositories(alice.user.id, { sort: "commits", now: NOW });
    expect(all.rows.map((r) => r.fullName)).toEqual(["alice/main", "alice/secret"]);
    expect(all.rows[0]).toMatchObject({ commits: 3, prs: 3, issues: 1 });
    expect((await listRepositories(alice.user.id, { language: "Rust", now: NOW })).total).toBe(1);
    expect((await listRepositories(alice.user.id, { search: "zzz", now: NOW })).total).toBe(0);
    expect((await listRepositories(alice.user.id, { type: "forks", now: NOW })).total).toBe(0);
    expect((await listRepositories(alice.user.id, { type: "active", now: NOW })).total).toBe(2);
  });

  it("computes language shares across selected repositories", async () => {
    const all = await getLanguageBreakdown(alice.user.id, {}, { now: NOW });
    expect(all.byBytes.map((l) => [l.language, l.share])).toEqual([["Go", 0.75], ["Rust", 0.25]]);
    expect(all.byCommits[0]).toMatchObject({ language: "Go", commits: 3 });
    const selected = await getLanguageBreakdown(alice.user.id, { repositoryIds: [alice.priv.id] }, { now: NOW });
    expect(selected.byBytes.map((l) => l.language)).toEqual(["Rust"]);
  });

  it("withholds insights for low-activity accounts", async () => {
    const { insights } = await getInsights(alice.user.id, { tz: "UTC", now: NOW });
    const trend = insights.find((i) => i.id === "activity-trend");
    expect(trend.status).toBe("insufficient");
    expect(insights.find((i) => i.id === "consistency").status).toBe("ok");
  });
});

describe("user data isolation", () => {
  it("never returns another user's repository", async () => {
    expect(await getRepository(alice.user.id, bob.repo.id)).toBeNull();
    expect((await getRepository(alice.user.id, alice.repo.id)).repo.fullName).toBe("alice/main");
  });

  it("ignores another user's repository id used as a filter", async () => {
    const s = await getActivitySeries(alice.user.id, { range: "30d", tz: "UTC", now: NOW, repositoryId: bob.repo.id });
    expect(s.totals).toEqual({ commits: 0, pullRequests: 0, issues: 0 });
    expect((await listCommits(alice.user.id, { repositoryId: bob.repo.id })).total).toBe(0);
    expect((await getEvents(alice.user.id, { repositoryId: bob.repo.id })).events).toHaveLength(0);
  });

  it("scopes every list and summary to the user", async () => {
    const commits = await listCommits(alice.user.id, {});
    expect(commits.rows.every((c) => c.sha.startsWith("alice"))).toBe(true);
    const events = await getEvents(alice.user.id, { limit: 50 });
    expect(events.events.every((e) => e.repository.startsWith("alice/"))).toBe(true);
    const repos = await listRepositories(alice.user.id, { now: NOW });
    expect(repos.rows.every((r) => r.fullName.startsWith("alice/"))).toBe(true);
  });

  it("hides private profiles from everyone but their owner", async () => {
    expect(await getProfile("alice", { viewerId: bob.user.id, now: NOW })).toBeNull();
    expect(await getProfile("alice", { now: NOW })).toBeNull();
    const own = await getProfile("alice", { viewerId: alice.user.id, now: NOW });
    expect(own).toMatchObject({ isOwner: true, isPublic: false });
  });

  it("excludes private repositories from public profiles by default", async () => {
    await prisma.userPreference.update({ where: { userId: alice.user.id }, data: { publicProfile: true } });
    const profile = await getProfile("ALICE", { viewerId: bob.user.id, now: NOW });
    expect(profile.featured.map((r) => r.fullName)).toEqual(["alice/main"]);
    expect(profile.stats).toMatchObject({ commits: 3, issues: 1, repositories: 1 });
    expect(profile.languages.map((l) => l.language)).toEqual(["Go"]);
    expect(profile.heatmap.total).toBe(3 + 3 + 1);
  });
});
