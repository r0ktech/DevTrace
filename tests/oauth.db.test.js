import { beforeEach, describe, expect, it } from "vitest";
import { createEncryptedAdapter, toAccountRecord } from "@/server/auth/options";
import { decryptToken } from "@/server/auth/crypto";
import { prisma, resetDatabase } from "./helpers/db";

beforeEach(resetDatabase);

const githubAccount = (userId, extra = {}) => ({
  userId,
  type: "oauth",
  provider: "github",
  providerAccountId: 12345,
  access_token: "gho_real_token",
  token_type: "bearer",
  scope: "read:user,repo,user:email",
  ...extra,
});

describe("OAuth sign-in flow", () => {
  it("links a GitHub account even when GitHub returns extra token fields", async () => {
    const adapter = createEncryptedAdapter(prisma);
    const user = await adapter.createUser({ name: "Octo", email: "octo@example.test", emailVerified: null, image: null });
    await adapter.linkAccount(githubAccount(user.id, { refresh_token: "ghr_x", expires_in: 28800, refresh_token_expires_in: 15897600, expires_at: 1790000000.5 }));

    const account = await prisma.account.findFirst({ where: { userId: user.id } });
    expect(account.providerAccountId).toBe("12345");
    expect(account.expires_at).toBe(1790000000);
    expect(decryptToken(account.access_token)).toBe("gho_real_token");
    expect(decryptToken(account.refresh_token)).toBe("ghr_x");
  });

  it("strips unknown fields and never stores plaintext tokens", () => {
    const record = toAccountRecord(githubAccount("u1", { refresh_token_expires_in: 1, unexpected: "x" }));
    expect(record).not.toHaveProperty("refresh_token_expires_in");
    expect(record).not.toHaveProperty("unexpected");
    expect(record.access_token).not.toContain("gho_");
  });

  it("recovers a user left behind by a failed sign-in instead of blocking the retry", async () => {
    const adapter = createEncryptedAdapter(prisma);
    // A previous attempt created the user, then failed before linking
    const orphan = await prisma.user.create({ data: { name: "Old", email: "octo@example.test" } });

    // NextAuth looks the email up first; an orphan must not trigger OAuthAccountNotLinked
    expect(await adapter.getUserByEmail("octo@example.test")).toBeNull();
    const user = await adapter.createUser({ name: "Octo", email: "octo@example.test", emailVerified: null, image: "img" });
    expect(user.id).toBe(orphan.id);
    await adapter.linkAccount(githubAccount(user.id));

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.account.count({ where: { userId: orphan.id } })).toBe(1);
    // Once linked, the user is found by email normally
    expect((await adapter.getUserByEmail("octo@example.test")).id).toBe(orphan.id);
  });

  it("does not reuse users that already have a linked account", async () => {
    const adapter = createEncryptedAdapter(prisma);
    const owner = await adapter.createUser({ name: "A", email: "a@example.test" });
    await adapter.linkAccount(githubAccount(owner.id));
    expect((await adapter.getUserByEmail("a@example.test")).id).toBe(owner.id);
  });
});
