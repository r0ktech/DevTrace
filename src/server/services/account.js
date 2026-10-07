import prisma from "../db.js";
import { getGitHubAccessToken } from "../auth/tokens.js";

/**
 * Ask GitHub to revoke DevTrace's OAuth grant for this token.
 * Best effort: the local token is deleted regardless.
 */
async function revokeGitHubGrant(token, fetchImpl = fetch) {
  const { GITHUB_CLIENT_ID: id, GITHUB_CLIENT_SECRET: secret } = process.env;
  if (!token || !id || !secret) return false;
  try {
    const response = await fetchImpl(`https://api.github.com/applications/${id}/grant`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "DevTrace",
      },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

async function safeToken(userId) {
  try {
    return await getGitHubAccessToken(userId);
  } catch {
    return null;
  }
}

/**
 * Disconnect GitHub: revoke the grant, delete the stored token and all
 * synchronized GitHub data, and end every session for the user.
 */
export async function disconnectGitHub(userId) {
  const revoked = await revokeGitHubGrant(await safeToken(userId));
  await prisma.$transaction([
    prisma.repository.deleteMany({ where: { userId } }),
    prisma.contributionDay.deleteMany({ where: { userId } }),
    prisma.syncJob.deleteMany({ where: { userId } }),
    prisma.weeklySummary.deleteMany({ where: { userId } }),
    prisma.connectedAccount.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId, provider: "github" } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  return { revoked };
}

/** Permanently delete the DevTrace account and everything attached to it. */
export async function deleteAccount(userId) {
  const revoked = await revokeGitHubGrant(await safeToken(userId));
  await prisma.user.delete({ where: { id: userId } });
  return { revoked };
}
