import { apiHandler } from "@/server/http";
import { disconnectGitHub } from "@/server/services/account";

// POST /api/account/disconnect — remove token and synced GitHub data
export const POST = apiHandler(
  async ({ user }) => {
    const { revoked } = await disconnectGitHub(user.id);
    return { disconnected: true, githubGrantRevoked: revoked };
  },
  { mutation: true, demoAllowed: false, limit: { limit: 5, windowSeconds: 300 }, name: "account-disconnect" },
);
