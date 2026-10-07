import { randomBytes } from "node:crypto";
import prisma from "../db.js";
import { DEMO_USER_ID, ensureDemoData } from "../demo/seed.js";

const DEMO_SESSION_MS = 24 * 60 * 60_000;

export function demoEnabled() {
  return process.env.DEMO_ENABLED !== "false";
}

/** Matches NextAuth v4's session cookie naming. */
export function sessionCookieName() {
  const secure = (process.env.NEXTAUTH_URL || "").startsWith("https://");
  return { name: `${secure ? "__Secure-" : ""}next-auth.session-token`, secure };
}

/**
 * Create a database session for the shared, read-only demo user.
 * NextAuth then treats the visitor as signed in to the demo account.
 */
export async function createDemoSession(now = new Date()) {
  await ensureDemoData(prisma, { now });
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(now.getTime() + DEMO_SESSION_MS);
  await prisma.session.create({ data: { sessionToken, userId: DEMO_USER_ID, expires } });
  // Opportunistically clean up expired demo sessions
  await prisma.session.deleteMany({ where: { userId: DEMO_USER_ID, expires: { lt: now } } });
  return { sessionToken, expires };
}
