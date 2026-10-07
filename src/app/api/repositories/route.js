import { apiHandler } from "@/server/http";
import { listRepositories, listRepositoryLanguages } from "@/server/analytics/repositories";
import { parseSearchParams, repositoryListQuery } from "@/server/validation";

// GET /api/repositories?q=&type=owned&language=Go&sort=commits&page=1
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(repositoryListQuery, searchParams);
  const [result, languages] = await Promise.all([
    listRepositories(user.id, { ...query, search: query.q }),
    listRepositoryLanguages(user.id),
  ]);
  return { ...result, languages };
});
