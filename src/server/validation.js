import { z } from "zod";
import { HEATMAP_PERIODS, RANGES, isValidTimeZone } from "../lib/dates.js";
import { REPOSITORY_SORTS } from "./analytics/repositories.js";

const optionalString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const id = z.string().regex(/^[a-z0-9]{10,40}$/i, "Invalid id");

export const rangeParam = z.enum(Object.keys(RANGES)).optional();
export const heatmapParam = z.enum(Object.keys(HEATMAP_PERIODS)).optional();
export const pageParam = z.coerce.number().int().min(1).max(10_000).default(1);
export const pageSizeParam = z.coerce.number().int().min(10).max(100).default(25);
export const repositoryIdParam = id.optional().or(z.literal("").transform(() => undefined));

export const idSchema = id;

export const repositoryListQuery = z.object({
  q: optionalString(100),
  type: z.enum(["all", "owned", "forks", "archived", "active", "contributed", "exclude-forks"]).default("all"),
  language: optionalString(60),
  sort: z.enum(Object.keys(REPOSITORY_SORTS)).default("activity"),
  page: pageParam,
  pageSize: pageSizeParam,
});

export const activityQuery = z.object({
  range: rangeParam,
  heatmap: heatmapParam,
  repo: repositoryIdParam,
});

export const commitsQuery = z.object({
  range: rangeParam,
  repo: repositoryIdParam,
  q: optionalString(100),
  page: pageParam,
  pageSize: pageSizeParam,
});

export const pullRequestsQuery = commitsQuery.extend({
  state: z.enum(["open", "merged", "closed"]).optional().or(z.literal("").transform(() => undefined)),
});

export const issuesQuery = commitsQuery.extend({
  state: z.enum(["open", "closed"]).optional().or(z.literal("").transform(() => undefined)),
});

export const languagesQuery = z.object({
  scope: z.enum(["all", "owned", "exclude-forks"]).optional(),
  archived: z.enum(["include", "exclude"]).default("include"),
  repos: z
    .string()
    .max(4000)
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : undefined))
    .pipe(z.array(id).max(200).optional()),
});

export const eventsQuery = z.object({
  repo: repositoryIdParam,
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const settingsPatch = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    defaultRange: z.enum(Object.keys(RANGES)).optional(),
    defaultRepoScope: z.enum(["all", "owned", "exclude-forks"]).optional(),
    timezone: z.string().max(64).refine(isValidTimeZone, "Unknown timezone").optional(),
    publicProfile: z.boolean().optional(),
    profileShowActivity: z.boolean().optional(),
    profileShowPrivateRepos: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "No settings provided");

export const deleteAccountBody = z.object({ confirm: z.string().trim().min(1).max(100) }).strict();

/** Parse URLSearchParams (or a plain object) with a schema. */
export function parseSearchParams(schema, searchParams) {
  const raw = searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams) : { ...(searchParams || {}) };
  for (const key of Object.keys(raw)) if (Array.isArray(raw[key])) raw[key] = raw[key][0];
  return schema.parse(raw);
}

/** Like parseSearchParams but returns schema defaults on invalid input (for pages). */
export function safeSearchParams(schema, searchParams) {
  try {
    return parseSearchParams(schema, searchParams);
  } catch {
    return schema.parse({});
  }
}
