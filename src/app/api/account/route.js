import { apiHandler, jsonError } from "@/server/http";
import { deleteAccount } from "@/server/services/account";
import { deleteAccountBody } from "@/server/validation";

// DELETE /api/account  body: { confirm: "<github login>" }
export const DELETE = apiHandler(
  async ({ user, request }) => {
    const { confirm } = deleteAccountBody.parse(await request.json());
    const expected = user.connectedAccounts[0]?.login || user.name || "delete";
    if (confirm.toLowerCase() !== expected.toLowerCase()) {
      return jsonError(400, "CONFIRMATION_MISMATCH", `Type ${expected} to confirm.`);
    }
    const { revoked } = await deleteAccount(user.id);
    return { deleted: true, githubGrantRevoked: revoked };
  },
  { mutation: true, demoAllowed: false, limit: { limit: 5, windowSeconds: 300 }, name: "account-delete" },
);
