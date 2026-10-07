import Anthropic from "@anthropic-ai/sdk";
import prisma from "../db.js";
import { getRecap } from "../analytics/recap.js";

// Optional feature. DevTrace works fully without it.
const MODEL = process.env.AI_SUMMARY_MODEL || "claude-opus-5-5";

const SYSTEM_PROMPT = `You write a short summary of a developer's last 7 days of GitHub activity for their personal analytics dashboard.

Use only the facts in the JSON you are given. It contains counts, repository names, and the exact titles of merged pull requests and closed issues.
- Do not claim accomplishments, features, or outcomes that are not stated in the data.
- Do not judge quality, productivity, or intent, and do not give advice.
- When you mention a pull request or issue, use its title as written.
- If the data is sparse, say so plainly rather than padding.

Write 2 to 4 sentences in the second person ("you"), plain text, no markdown, no lists.`;

export class SummaryUnavailableError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function aiSummaryEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_SUMMARY_ENABLED !== "false";
}

/** The aggregated, factual input sent to the model (and shown beside the summary). */
export function buildSummaryInput(recap) {
  return {
    period: { days: recap.days, startDate: recap.startKey },
    commits: recap.commits,
    activeDays: recap.activeDays,
    pullRequestsOpened: recap.pullRequestsOpened,
    pullRequestsMerged: recap.pullRequestsMerged,
    issuesOpened: recap.issuesOpened,
    issuesClosed: recap.issuesClosed,
    repositories: recap.repositories.slice(0, 6).map((r) => ({ name: r.name, events: r.count })),
    mergedPullRequests: recap.mergedPullRequests.slice(0, 10).map((pr) => ({ repository: pr.repository.fullName, title: pr.title })),
    closedIssues: recap.closedIssues.slice(0, 10).map((i) => ({ repository: i.repository.fullName, title: i.title })),
  };
}

export async function getLatestSummary(userId) {
  const summary = await prisma.weeklySummary.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return summary && { id: summary.id, content: summary.content, metrics: summary.metrics, model: summary.model, createdAt: summary.createdAt };
}

export async function generateWeeklySummary(userId, { tz, now = new Date(), client } = {}) {
  if (!aiSummaryEnabled()) throw new SummaryUnavailableError("AI_DISABLED", "AI summaries are not enabled on this server.");

  const recap = await getRecap(userId, { days: 7, tz, now });
  const input = buildSummaryInput(recap);
  if (input.commits + input.pullRequestsOpened + input.issuesOpened + input.issuesClosed === 0) {
    throw new SummaryUnavailableError("NOT_ENOUGH_DATA", "There's no activity in the last 7 days to summarize.");
  }

  const anthropic = client || new Anthropic();
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  if (response.stop_reason === "refusal") {
    throw new SummaryUnavailableError("REFUSED", "The summary couldn't be generated for this data.");
  }
  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!content) throw new SummaryUnavailableError("EMPTY", "The model returned an empty summary.");

  const saved = await prisma.weeklySummary.create({
    data: {
      userId,
      periodStart: new Date(`${recap.startKey}T00:00:00Z`),
      periodEnd: now,
      content,
      metrics: input,
      model: response.model || MODEL,
    },
  });
  return { id: saved.id, content, metrics: input, model: saved.model, createdAt: saved.createdAt };
}
