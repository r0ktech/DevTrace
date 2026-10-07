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

function encryptAccountTokens(account) {
  return {
    ...account,
    access_token: account.access_token ? encryptToken(account.access_token) : null,
    refresh_token: account.refresh_token ? encryptToken(account.refresh_token) : null,
  };
}

/**
 * PrismaAdapter that encrypts OAuth tokens before they are stored.
 */
export function createEncryptedAdapter(client = prisma) {
  const base = PrismaAdapter(client);
  return {
    ...base,
    linkAccount: async (account) => {
      // Never attach a real GitHub account to the shared demo user
      if (account.userId === DEMO_USER_ID) throw new Error("Cannot link an account to the demo user");
      return base.linkAccount(encryptAccountTokens(account));
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
