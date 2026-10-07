import prisma from "../db.js";
import { decryptToken } from "./crypto.js";

/**
 * Server-only: returns the decrypted GitHub OAuth token for a user, or null.
 * Never pass the result to a client component or API response.
 */
export async function getGitHubAccessToken(userId) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
    select: { access_token: true },
  });
  if (!account?.access_token) return null;
  return decryptToken(account.access_token);
}
