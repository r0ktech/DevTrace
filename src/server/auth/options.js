import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../db.js";
import { encryptToken } from "./crypto.js";
import { DEMO_USER_ID } from "../demo/seed.js";

// `repo` is required to read private repositories; GitHub OAuth apps don't
// offer a read-only variant. DevTrace only ever issues GET/GraphQL queries.
// Set GITHUB_OAUTH_SCOPE="read:user user:email" to sync public data only.
export const GITHUB_SCOPE = process.env.GITHUB_OAUTH_SCOPE || "read:user user:email repo";

/** True when the GitHub OAuth app credentials are present. */
export function githubConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

// NextAuth copies GitHub's token response onto the account verbatim. GitHub
// can include fields such as `refresh_token_expires_in` that have no column,
// which would make Prisma reject the row and abort sign-in. Keep only real columns.
const ACCOUNT_COLUMNS = [
  "userId",
  "type",
  "provider",
  "providerAccountId",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
];

export function toAccountRecord(account) {
  const record = {};
  for (const key of ACCOUNT_COLUMNS) if (account[key] !== undefined) record[key] = account[key];
  if (record.providerAccountId != null) record.providerAccountId = String(record.providerAccountId);
  if (record.expires_at != null) record.expires_at = Math.trunc(Number(record.expires_at)) || null;
  record.access_token = account.access_token ? encryptToken(account.access_token) : null;
  record.refresh_token = account.refresh_token ? encryptToken(account.refresh_token) : null;
  return record;
}

/**
 * PrismaAdapter with three changes:
 * - OAuth tokens are encrypted before they are stored
 * - only known Account columns are written
 * - "orphaned" users (created, but whose GitHub link failed mid sign-in) are
 *   reused on the next attempt instead of blocking it with OAuthAccountNotLinked.
 *   NextAuth v4 doesn't create the user and account in one transaction.
 */
export function createEncryptedAdapter(client = prisma) {
  const base = PrismaAdapter(client);

  async function findOrphan(email) {
    if (!email) return null;
    return client.user.findFirst({ where: { email, isDemo: false, accounts: { none: {} } } });
  }

  return {
    ...base,
    async getUserByEmail(email) {
      // An orphan has no linked account, so it can't belong to anyone else:
      // hide it so NextAuth proceeds to createUser, which reuses it below.
      if (await findOrphan(email)) return null;
      return base.getUserByEmail(email);
    },
    async createUser(data) {
      const orphan = await findOrphan(data.email);
      if (orphan) {
        return client.user.update({ where: { id: orphan.id }, data: { name: data.name ?? orphan.name, image: data.image ?? orphan.image } });
      }
      return base.createUser(data);
    },
    async linkAccount(account) {
      // Never attach a real GitHub account to the shared demo user
      if (account.userId === DEMO_USER_ID) throw new Error("Cannot link an account to the demo user");
      return client.account.create({ data: toAccountRecord(account) });
    },
  };
}

export const authOptions = {
  adapter: createEncryptedAdapter(),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: GITHUB_SCOPE } },
    }),
  ],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/", error: "/auth/error" },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    // Surface the underlying cause in the server log; the browser only sees an error code
    error(code, metadata) {
      const cause = metadata?.error || metadata;
      console.error(`[auth] ${code}:`, cause?.message || cause, cause?.stack ? `\n${cause.stack.split("\n").slice(0, 4).join("\n")}` : "");
    },
    warn(code) {
      if (code !== "DEBUG_ENABLED") console.warn(`[auth] warning: ${code}`);
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Only non-sensitive identifiers reach the browser.
      return { ...session, user: { id: user.id, name: user.name, image: user.image, isDemo: Boolean(user.isDemo) } };
    },
  },
  events: {
    async createUser({ user }) {
      await prisma.userPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    },
    // NextAuth only stores tokens on first link. Refresh the stored
    // (encrypted) token on every sign-in so a re-authorization takes effect.
    async signIn({ account }) {
      if (account?.provider !== "github" || !account.access_token) return;
      await prisma.account.updateMany({
        where: { provider: "github", providerAccountId: String(account.providerAccountId) },
        data: { access_token: encryptToken(account.access_token), scope: account.scope ?? null },
      });
    },
  },
};
