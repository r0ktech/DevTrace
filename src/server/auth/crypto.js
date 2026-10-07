import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// OAuth tokens are encrypted with AES-256-GCM before they are written to the
// database. Format: "v1:<iv>:<authTag>:<ciphertext>" (base64url parts).

const PREFIX = "v1";

function getKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  // Accept any high-entropy string; derive a fixed-length key from it.
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext) {
  if (plaintext == null) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptToken(value) {
  if (value == null) return value;
  const parts = String(value).split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Stored token is not in the expected encrypted format");
  }
  const [, iv, tag, ciphertext] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function isEncryptedToken(value) {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}
