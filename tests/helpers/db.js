import prisma from "@/server/db";
import { encryptToken } from "@/server/auth/crypto";

export { prisma };

export async function resetDatabase() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users", "verification_tokens" RESTART IDENTITY CASCADE');
}

let counter = 0;

/** A DevTrace user with a linked (encrypted) GitHub token. */
export async function createUser({ login = `user${++counter}`, token = `gho_${login}`, isDemo = false, timezone = "UTC" } = {}) {
  const user = await prisma.user.create({
    data: {
      name: login,
      email: `${login}@example.test`,
      isDemo,
      preferences: { create: { timezone } },
      accounts: {
        create: { type: "oauth", provider: "github", providerAccountId: `gh-${login}`, access_token: encryptToken(token) },
      },
    },
  });
  return user;
}

export async function createRepository(userId, overrides = {}) {
  counter += 1;
  return prisma.repository.create({
    data: {
      userId,
      provider: "github",
      externalId: String(9000 + counter),
      ownerLogin: "owner",
      name: `repo-${counter}`,
      fullName: `owner/repo-${counter}`,
      isOwner: true,
      ...overrides,
    },
  });
}
