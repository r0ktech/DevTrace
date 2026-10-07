import { Prisma } from "@prisma/client";

// Prisma stores DateTime as UTC "timestamp without time zone".
// These helpers convert a column to the user's local calendar.

const COLUMNS = new Set(['"committedAt"', '"openedAt"', '"mergedAt"', '"closedAt"', "c.\"committedAt\"", "p.\"openedAt\"", "i.\"openedAt\""]);

function col(column) {
  if (!COLUMNS.has(column)) throw new Error(`Unexpected column ${column}`);
  return Prisma.raw(column);
}

export function localTimestamp(column, tz) {
  return Prisma.sql`((${col(column)} AT TIME ZONE 'UTC') AT TIME ZONE ${tz})`;
}

/** 'YYYY-MM-DD' of the start of the local day/week/month bucket. */
export function localBucket(column, tz, unit = "day") {
  if (!["day", "week", "month"].includes(unit)) throw new Error(`Unexpected unit ${unit}`);
  return Prisma.sql`to_char(date_trunc(${unit}, ${localTimestamp(column, tz)}), 'YYYY-MM-DD')`;
}

export function optionalRepoFilter(repositoryId, alias = "") {
  if (!repositoryId) return Prisma.empty;
  const column = Prisma.raw(alias ? `${alias}."repositoryId"` : '"repositoryId"');
  return Prisma.sql`AND ${column} = ${repositoryId}`;
}

export const toInt = (value) => Number(value ?? 0);
