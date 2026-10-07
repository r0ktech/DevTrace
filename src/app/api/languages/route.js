import { apiHandler } from "@/server/http";
import { getLanguageBreakdown } from "@/server/analytics/languages";
import { getPreferences } from "@/server/services/preferences";
import { languagesQuery, parseSearchParams } from "@/server/validation";

// GET /api/languages?scope=owned&archived=exclude&repos=id1,id2
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(languagesQuery, searchParams);
  const prefs = await getPreferences(user.id);
  const scope = query.scope || prefs.defaultRepoScope;
  const breakdown = await getLanguageBreakdown(user.id, {
    scope,
    includeArchived: query.archived === "include",
    repositoryIds: query.repos,
  });
  return {
    scope,
    explanation: "Based on language usage across your selected repositories. Bytes come from GitHub's linguist analysis of each repository; commit share attributes your commits from the last year to each repository's primary language.",
    ...breakdown,
  };
});
