export const demoProfile = {
  name: "Rohan K.",
  username: "r0ktech",
  avatar: "https://avatars.githubusercontent.com/u/1?v=4",
  bio: "Building tools for developers, shipping product and platform work.",
  location: "London, UK",
  company: "Independent",
  githubUrl: "https://github.com/r0ktech",
};

export const demoMetrics = {
  contributions: 184,
  commits: 126,
  pullRequests: 28,
  issues: 17,
  repositories: 12,
};

export const demoHeatmap = [
  { date: "2026-03-02", count: 2 },
  { date: "2026-03-03", count: 0 },
  { date: "2026-03-04", count: 4 },
  { date: "2026-03-05", count: 6 },
  { date: "2026-03-06", count: 1 },
  { date: "2026-03-07", count: 0 },
  { date: "2026-03-08", count: 3 },
  { date: "2026-03-09", count: 8 },
  { date: "2026-03-10", count: 4 },
  { date: "2026-03-11", count: 5 },
  { date: "2026-03-12", count: 2 },
  { date: "2026-03-13", count: 0 },
  { date: "2026-03-14", count: 7 },
  { date: "2026-03-15", count: 9 },
  { date: "2026-03-16", count: 3 },
  { date: "2026-03-17", count: 1 },
  { date: "2026-03-18", count: 6 },
  { date: "2026-03-19", count: 2 },
  { date: "2026-03-20", count: 4 },
  { date: "2026-03-21", count: 0 },
  { date: "2026-03-22", count: 8 },
  { date: "2026-03-23", count: 12 },
  { date: "2026-03-24", count: 5 },
  { date: "2026-03-25", count: 6 },
  { date: "2026-03-26", count: 0 },
  { date: "2026-03-27", count: 7 },
  { date: "2026-03-28", count: 10 },
  { date: "2026-03-29", count: 4 },
  { date: "2026-03-30", count: 2 },
  { date: "2026-03-31", count: 5 },
];

export const demoActivity = [
  { label: "Mon", commits: 12, prs: 4, issues: 3 },
  { label: "Tue", commits: 9, prs: 3, issues: 2 },
  { label: "Wed", commits: 14, prs: 5, issues: 4 },
  { label: "Thu", commits: 18, prs: 6, issues: 3 },
  { label: "Fri", commits: 17, prs: 7, issues: 2 },
  { label: "Sat", commits: 10, prs: 2, issues: 1 },
  { label: "Sun", commits: 8, prs: 1, issues: 2 },
];

export const demoRepositories = [
  {
    name: "devtrace",
    description: "Developer analytics platform for GitHub workflows.",
    language: "JavaScript",
    stars: 164,
    forks: 19,
    commits: 48,
    prs: 12,
    issues: 5,
    lastActivity: "2 days ago",
  },
  {
    name: "platform-ui",
    description: "Design system and application shell for the product team.",
    language: "TypeScript",
    stars: 91,
    forks: 12,
    commits: 36,
    prs: 8,
    issues: 3,
    lastActivity: "4 days ago",
  },
  {
    name: "api-gateway",
    description:
      "Internal gateway for requests, rate limiting, routing, and observability.",
    language: "Go",
    stars: 72,
    forks: 10,
    commits: 29,
    prs: 6,
    issues: 2,
    lastActivity: "1 week ago",
  },
  {
    name: "infra-ops",
    description:
      "Deployment automation, container configuration and runtime checks.",
    language: "Python",
    stars: 58,
    forks: 7,
    commits: 21,
    prs: 5,
    issues: 4,
    lastActivity: "9 days ago",
  },
];

export const demoLanguages = [
  { language: "JavaScript", value: 42 },
  { language: "TypeScript", value: 31 },
  { language: "Python", value: 17 },
  { language: "Go", value: 10 },
];

export const demoInsights = [
  "Your activity increased 24% compared with the previous 30 days.",
  "Most of your recent work concentrated in three repositories: devtrace, platform-ui, and api-gateway.",
  "You are most active on weekdays, with Thursday and Friday leading your commit cadence.",
  "Pull requests are being merged faster than last month.",
];

export const demoCommits = [
  {
    repo: "devtrace",
    message: "Add activity summary cards for overview screen",
    author: "r0ktech",
    date: "2026-09-11",
  },
  {
    repo: "platform-ui",
    message: "Refine navigation density for desktop headers",
    author: "r0ktech",
    date: "2026-09-10",
  },
  {
    repo: "api-gateway",
    message: "Normalize request metadata in proxy middleware",
    author: "r0ktech",
    date: "2026-09-09",
  },
  {
    repo: "infra-ops",
    message: "Patch build pipeline caching for front-end artifacts",
    author: "r0ktech",
    date: "2026-09-08",
  },
];

export const demoPullRequests = [
  {
    repo: "devtrace",
    title: "Add sync status indicators and retry states",
    status: "Merged",
    created: "2026-09-07",
    merged: "2026-09-09",
  },
  {
    repo: "platform-ui",
    title: "Tighten spacing scale across dashboard cards",
    status: "Open",
    created: "2026-09-11",
    merged: "-",
  },
  {
    repo: "api-gateway",
    title: "Improve rate-limit observability in response headers",
    status: "Closed",
    created: "2026-09-03",
    merged: "-",
  },
];

export const demoIssues = [
  {
    repo: "devtrace",
    title: "Empty state for no sync history",
    status: "Closed",
    created: "2026-09-06",
  },
  {
    repo: "platform-ui",
    title: "Theme toggle not persisting on reload",
    status: "Open",
    created: "2026-09-12",
  },
  {
    repo: "infra-ops",
    title: "Reduce deployment retry delay during cold starts",
    status: "Closed",
    created: "2026-09-02",
  },
];
