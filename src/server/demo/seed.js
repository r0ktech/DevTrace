import { initialStages, SYNC_STAGES } from "../../lib/sync-stages.js";
import { addDaysKey, dateToKey, weekdayIndex } from "../../lib/dates.js";

// Generates a clearly fictional sample account for "Explore demo".
// Data is deterministic (seeded PRNG) and anchored to the current date so
// charts look current. No real people, organizations or URLs are used.

export const DEMO_USER_ID = "devtrace_demo_user";
export const DEMO_LOGIN = "devtrace-demo";
const DAYS = 420;
const DAY = 86_400_000;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REPOS = [
  {
    key: "ledger-api", owner: DEMO_LOGIN, lang: "TypeScript", desc: "Double-entry bookkeeping API with idempotent transfers",
    stars: 48, forks: 6, weight: 1.0, active: [0, 420], langs: { TypeScript: 412000, SQL: 38000, Dockerfile: 1200 },
    work: ["idempotency keys for transfers", "ledger balance snapshots", "currency rounding", "webhook retries", "account statements export", "migration for journal entries", "rate limiter middleware", "OpenAPI schema"],
  },
  {
    key: "trace-cli", owner: DEMO_LOGIN, lang: "Go", desc: "Inspect and diff HTTP traces from the terminal",
    stars: 132, forks: 14, weight: 0.8, active: [0, 160], langs: { Go: 186000, Makefile: 2100, Shell: 3400 },
    work: ["HAR import", "trace diff output", "colorized headers", "--json flag", "gzip body decoding", "release workflow", "flaky timer test"],
  },
  {
    key: "pixel-board", owner: DEMO_LOGIN, lang: "JavaScript", desc: "Collaborative pixel canvas over WebSockets",
    stars: 21, forks: 3, weight: 0.55, active: [150, 330], langs: { JavaScript: 98000, CSS: 14000, HTML: 4200 },
    work: ["cursor presence", "canvas zoom", "room permissions", "reconnect backoff", "palette picker", "undo history"],
  },
  {
    key: "forecast-notebooks", owner: DEMO_LOGIN, lang: "Python", desc: "Experiments with time-series forecasting",
    stars: 9, forks: 1, weight: 0.35, active: [60, 260], langs: { Python: 71000, "Jupyter Notebook": 520000 },
    work: ["seasonal decomposition", "holiday features", "backtesting harness", "plot styling", "data loader caching"],
  },
  {
    key: "design-tokens", owner: "sample-org", lang: "TypeScript", desc: "Shared design tokens and theme build pipeline",
    stars: 17, forks: 4, weight: 0.45, active: [0, 90], langs: { TypeScript: 54000, CSS: 9000, JavaScript: 6100 },
    work: ["dark theme tokens", "contrast checks", "token docs page", "CSS variable output", "spacing scale"],
  },
  {
    key: "station-firmware", owner: DEMO_LOGIN, lang: "Rust", desc: "Firmware for a home weather station",
    stars: 33, forks: 2, weight: 0.3, active: [240, 420], langs: { Rust: 64000, C: 3000 },
    work: ["BME280 driver", "low-power sleep", "MQTT publishing", "sensor calibration", "OTA updates"],
  },
  {
    key: "dotfiles", owner: DEMO_LOGIN, lang: "Shell", desc: "Personal shell and editor configuration",
    stars: 4, forks: 0, weight: 0.12, active: [0, 420], langs: { Shell: 12000, Lua: 8000 },
    work: ["zsh prompt", "neovim lsp config", "git aliases", "tmux bindings"],
  },
  {
    key: "portfolio-2019", owner: DEMO_LOGIN, lang: "HTML", desc: "Old personal site", archived: true,
    stars: 1, forks: 0, weight: 0, active: [400, 420], langs: { HTML: 18000, CSS: 7000 }, work: [],
  },
  {
    key: "tabular", owner: DEMO_LOGIN, lang: "JavaScript", desc: "Fork of a headless table library", fork: true,
    stars: 0, forks: 0, weight: 0.05, active: [100, 140], langs: { JavaScript: 120000 }, work: ["column pinning patch"],
  },
  {
    key: "parser-kit", owner: "sample-oss", lang: "TypeScript", desc: "Incremental parser toolkit (sample open source project)",
    stars: 2400, forks: 210, weight: 0.15, active: [20, 200], affiliated: false, langs: {}, work: ["error recovery in lexer", "sourcemap offsets", "docs typo"],
  },
];

const VERBS = ["Add", "Fix", "Refactor", "Update", "Improve", "Remove", "Document", "Test"];
const BRANCH_PREFIX = ["feature", "fix", "chore"];
const CONTRIBUTORS = ["alex-sample", "sam-sample", "riley-sample", "jordan-sample"];

// Same shape as real (cuid) ids so they pass the same validation
const demoRepoId = (index) => `demorepo${String(index).padStart(6, "0")}`;

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
}

/** Pure generator: returns plain records ready for createMany. */
export function generateDemoData(now = new Date(), seed = 20260101) {
  const rand = mulberry32(seed);
  const todayKey = dateToKey(now);
  const repos = [];
  const commits = [];
  const pullRequests = [];
  const issues = [];
  const languageStats = [];
  const contributors = [];
  const perDay = new Map();
  const bump = (date) => {
    const key = dateToKey(date);
    perDay.set(key, (perDay.get(key) || 0) + 1);
  };

  REPOS.forEach((def, index) => {
    const id = demoRepoId(index);
    repos.push({
      id,
      userId: DEMO_USER_ID,
      provider: "github",
      externalId: `demo-${index}`,
      ownerLogin: def.owner,
      name: def.key,
      fullName: `${def.owner}/${def.key}`,
      description: def.desc,
      url: null,
      primaryLanguage: def.lang,
      stars: def.stars,
      forks: def.forks,
      openIssues: 0,
      sizeKb: 400 + index * 37,
      isPrivate: index === 3 || index === 6,
      isFork: Boolean(def.fork),
      isArchived: Boolean(def.archived),
      isOwner: def.owner === DEMO_LOGIN,
      isAffiliated: def.affiliated !== false,
      defaultBranch: "main",
      repoCreatedAt: new Date(now.getTime() - (DAYS + 200 + index * 30) * DAY),
      repoPushedAt: new Date(now.getTime() - def.active[0] * DAY - 3_600_000 * (index + 1)),
      commitsSyncedAt: now,
      contributorsSyncedAt: now,
    });
    for (const [language, bytes] of Object.entries(def.langs)) {
      languageStats.push({ repositoryId: id, language, bytes, color: null });
    }
    if (def.affiliated !== false) {
      contributors.push({ repositoryId: id, login: DEMO_LOGIN, contributions: 0 });
      const extra = def.owner === "sample-org" ? 3 : index % 3 === 0 ? 1 : 0;
      for (let c = 0; c < extra; c++) {
        contributors.push({ repositoryId: id, login: CONTRIBUTORS[c], contributions: 20 + Math.floor(rand() * 120) });
      }
    }
  });

  let prNumber = 1;
  let issueNumber = 1;
  for (let ago = DAYS - 1; ago >= 0; ago--) {
    const dayKey = addDaysKey(todayKey, -ago);
    const weekday = weekdayIndex(dayKey);
    const isWeekend = weekday >= 5;
    // Occasional vacations produce realistic gaps
    if (ago % 97 < 6 && ago > 10) continue;
    if (rand() > (isWeekend ? 0.22 : 0.78)) continue;

    REPOS.forEach((def, index) => {
      if (ago < def.active[0] || ago > def.active[1] || def.weight === 0) return;
      if (rand() > def.weight * 0.85) return;
      const repositoryId = demoRepoId(index);
      const count = 1 + Math.floor(rand() * (isWeekend ? 3 : 6));
      const topic = pick(rand, def.work);
      for (let n = 0; n < count; n++) {
        const hour = Math.min(23, Math.max(7, Math.round(14 + (rand() + rand() + rand() - 1.5) * 6)));
        const at = new Date(`${dayKey}T${String(hour).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00Z`);
        if (at > now) continue;
        const sha = Array.from({ length: 40 }, () => Math.floor(rand() * 16).toString(16)).join("");
        commits.push({
          userId: DEMO_USER_ID,
          repositoryId,
          sha,
          message: `${pick(rand, VERBS)} ${topic}`,
          authorName: "Sample Developer",
          authorEmail: "demo@devtrace.invalid",
          authorLogin: DEMO_LOGIN,
          committedAt: at,
          url: null,
        });
        bump(at);
      }

      if (rand() < 0.16) {
        const openedAt = new Date(`${dayKey}T${String(10 + Math.floor(rand() * 7)).padStart(2, "0")}:15:00Z`);
        if (openedAt <= now) {
          const roll = rand();
          const mergeHours = 1 + rand() * rand() * 120;
          const decidedAt = new Date(openedAt.getTime() + mergeHours * 3_600_000);
          const decided = decidedAt <= now && (ago > 2 || roll < 0.5);
          const state = !decided ? "open" : roll < 0.86 ? "merged" : "closed";
          pullRequests.push({
            userId: DEMO_USER_ID,
            repositoryId,
            externalId: `demo-pr-${prNumber}`,
            number: prNumber,
            title: `${pick(rand, VERBS)} ${topic}`,
            state,
            isDraft: state === "open" && rand() < 0.3,
            authorLogin: DEMO_LOGIN,
            url: null,
            additions: Math.floor(10 + rand() * 600),
            deletions: Math.floor(rand() * 250),
            changedFiles: Math.floor(1 + rand() * 18),
            headRef: `${pick(rand, BRANCH_PREFIX)}/${slug(topic)}`,
            baseRef: "main",
            openedAt,
            mergedAt: state === "merged" ? decidedAt : null,
            closedAt: state === "open" ? null : decidedAt,
            remoteUpdatedAt: state === "open" ? openedAt : decidedAt,
          });
          bump(openedAt);
          prNumber += 1;
        }
      }

      if (rand() < 0.05) {
        const openedAt = new Date(`${dayKey}T09:40:00Z`);
        const closeAfter = (2 + rand() * rand() * 500) * 3_600_000;
        const closedAt = new Date(openedAt.getTime() + closeAfter);
        const closed = closedAt <= now && rand() < 0.8;
        issues.push({
          userId: DEMO_USER_ID,
          repositoryId,
          externalId: `demo-issue-${issueNumber}`,
          number: 1000 + issueNumber,
          title: `${pick(rand, ["Bug:", "Investigate", "Track", "Support"])} ${topic}`,
          state: closed ? "closed" : "open",
          authorLogin: DEMO_LOGIN,
          labels: [pick(rand, ["bug", "enhancement", "docs", "performance"])],
          comments: Math.floor(rand() * 6),
          url: null,
          openedAt,
          closedAt: closed ? closedAt : null,
          remoteUpdatedAt: closed ? closedAt : openedAt,
        });
        bump(openedAt);
        issueNumber += 1;
      }
    });
  }

  const contributions = [...perDay.entries()]
    .filter(([key]) => key > addDaysKey(todayKey, -365))
    .map(([key, count]) => ({ userId: DEMO_USER_ID, date: new Date(`${key}T00:00:00Z`), count }));

  const ownCommits = new Map();
  for (const c of commits) ownCommits.set(c.repositoryId, (ownCommits.get(c.repositoryId) || 0) + 1);
  for (const c of contributors) if (c.login === DEMO_LOGIN) c.contributions = ownCommits.get(c.repositoryId) || 0;
  for (const repo of repos) {
    repo.openIssues = issues.filter((i) => i.repositoryId === repo.id && i.state === "open").length;
  }

  return { repos, commits, pullRequests, issues, languageStats, contributors, contributions };
}

/**
 * Replace the demo account's data. Idempotent.
 */
export async function seedDemo(prisma, { now = new Date() } = {}) {
  const data = generateDemoData(now);
  const stages = initialStages();
  const counts = {
    profile: 1,
    repositories: data.repos.filter((r) => r.isAffiliated).length,
    contributions: data.contributions.reduce((t, d) => t + d.count, 0),
    commits: data.commits.length,
    pull_requests: data.pullRequests.length,
    issues: data.issues.length,
    languages: new Set(data.languageStats.map((l) => l.language)).size,
  };
  for (const { key } of SYNC_STAGES) stages[key] = { status: "done", count: counts[key] };

  await prisma.$transaction(
    async (tx) => {
      await tx.user.upsert({
        where: { id: DEMO_USER_ID },
        create: { id: DEMO_USER_ID, name: "Sample Developer", isDemo: true },
        update: { name: "Sample Developer", isDemo: true },
      });
      await tx.repository.deleteMany({ where: { userId: DEMO_USER_ID } });
      await tx.contributionDay.deleteMany({ where: { userId: DEMO_USER_ID } });
      await tx.syncJob.deleteMany({ where: { userId: DEMO_USER_ID } });
      await tx.connectedAccount.upsert({
        where: { userId_provider: { userId: DEMO_USER_ID, provider: "github" } },
        create: {
          userId: DEMO_USER_ID,
          provider: "github",
          externalId: "demo",
          login: DEMO_LOGIN,
          name: "Sample Developer",
          bio: "A fictional account used to demonstrate DevTrace. Every repository, commit and pull request here is generated sample data.",
          location: "Sample City",
          profileUrl: null,
          publicRepos: 8,
        },
        update: {},
      });
      await tx.userPreference.upsert({
        where: { userId: DEMO_USER_ID },
        create: { userId: DEMO_USER_ID, timezone: "UTC", publicProfile: true },
        update: {},
      });
      await tx.repository.createMany({ data: data.repos });
      await tx.languageStat.createMany({ data: data.languageStats });
      await tx.repositoryContributor.createMany({ data: data.contributors });
      await tx.commit.createMany({ data: data.commits, skipDuplicates: true });
      await tx.pullRequest.createMany({ data: data.pullRequests });
      await tx.issue.createMany({ data: data.issues });
      await tx.contributionDay.createMany({ data: data.contributions });
      await tx.syncJob.create({
        data: { userId: DEMO_USER_ID, status: "completed", trigger: "demo", stages, startedAt: now, finishedAt: now, heartbeatAt: now },
      });
    },
    { timeout: 60_000 },
  );
  return counts;
}

/** Seed when missing or older than a day, so the demo always looks current. */
export async function ensureDemoData(prisma, { now = new Date() } = {}) {
  const last = await prisma.syncJob.findFirst({
    where: { userId: DEMO_USER_ID, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!last || now - last.finishedAt > DAY) await seedDemo(prisma, { now });
}
