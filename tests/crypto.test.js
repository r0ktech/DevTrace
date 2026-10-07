import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, isEncryptedToken } from "@/server/auth/crypto";

describe("token encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    const encrypted = encryptToken("gho_secret123");
    expect(encrypted).not.toContain("gho_secret123");
    expect(isEncryptedToken(encrypted)).toBe(true);
    expect(decryptToken(encrypted)).toBe("gho_secret123");
  });

  it("uses a fresh IV per encryption", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("detects tampering", () => {
    const [v, iv, tag, data] = encryptToken("gho_secret").split(":");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptToken([v, iv, tag, flipped.toString("base64url")].join(":"))).toThrow();
  });

  it("rejects unencrypted values", () => {
    expect(() => decryptToken("gho_plaintext")).toThrow(/encrypted format/);
  });

  it("fails with a different key", () => {
    const encrypted = encryptToken("gho_secret");
    const original = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = "another-key";
    try {
      expect(() => decryptToken(encrypted)).toThrow();
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = original;
    }
  });
});
