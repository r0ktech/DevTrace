import Anthropic from "@anthropic-ai/sdk";
import { apiHandler, jsonError } from "@/server/http";
import { generateWeeklySummary, getLatestSummary, SummaryUnavailableError } from "@/server/ai/weekly-summary";
import { getAnalyticsContext } from "@/server/services/preferences";

// GET /api/summary — latest AI weekly summary
export const GET = apiHandler(async ({ user }) => ({ summary: await getLatestSummary(user.id) }));

// POST /api/summary — generate a new one (optional feature)
export const POST = apiHandler(
  async ({ user }) => {
    const { tz } = await getAnalyticsContext(user.id);
    try {
      return { summary: await generateWeeklySummary(user.id, { tz }) };
    } catch (error) {
      if (error instanceof SummaryUnavailableError) {
        return jsonError(error.code === "AI_DISABLED" ? 404 : 422, error.code, error.message);
      }
      if (error instanceof Anthropic.RateLimitError) {
        return jsonError(503, "AI_RATE_LIMITED", "The AI provider is rate limiting requests. Try again in a few minutes.");
      }
      if (error instanceof Anthropic.APIError) {
        console.error("[summary] provider error", error.status, error.message);
        return jsonError(502, "AI_PROVIDER_ERROR", "The AI provider returned an error. Your analytics are unaffected.");
      }
      throw error;
    }
  },
  { mutation: true, demoAllowed: false, limit: { limit: 3, windowSeconds: 3600 }, name: "summary" },
);
