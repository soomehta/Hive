import { describe, it, expect, beforeAll } from "vitest";

// Set ENCRYPTION_KEY *before* importing the module so the module-level
// getEncryptionKey() can read it at import time if needed.
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.ENCRYPTION_KEY = TEST_KEY;

// We must mock `@/lib/db` because oauth.ts has a top-level import of `db`
// and `integrations` which would fail without a real DB connection.
import { vi } from "vitest";
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/lib/db/schema", () => ({
  integrations: {},
}));

// Now safe to import the pure crypto helpers.
import { encryptToken, decryptToken } from "@/lib/integrations/oauth";

// ---------- Tests ---------------------------------------------------------

describe("encryptToken / decryptToken", () => {
  it("round-trips a simple string", () => {
    const plaintext = "my-secret-access-token";
    const encrypted = encryptToken(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptToken("");
    expect(decryptToken(encrypted)).toBe("");
  });

  it("round-trips a long token with special characters", () => {
    const plaintext =
      "ya29.a0AfH6SMB_~!@#$%^&*()+={}[]|:;<>,.?/abc123-xyz_refresh";
    const encrypted = encryptToken(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces ciphertext in the format iv:authTag:encrypted (3 colon-separated parts)", () => {
    const encrypted = encryptToken("test-token");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be non-empty base64
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("different plaintexts produce different ciphertexts", () => {
    const a = encryptToken("token-alpha");
    const b = encryptToken("token-beta");
    expect(a).not.toBe(b);
  });

  it("encrypting the same plaintext twice produces different ciphertexts (random IV)", () => {
    const first = encryptToken("same-token");
    const second = encryptToken("same-token");
    expect(first).not.toBe(second);
    // But both still decrypt to the same value
    expect(decryptToken(first)).toBe("same-token");
    expect(decryptToken(second)).toBe("same-token");
  });

  it("decryption fails with a corrupted ciphertext", () => {
    const encrypted = encryptToken("good-token");
    // Corrupt the encrypted portion (third segment)
    const parts = encrypted.split(":");
    parts[2] = "AAAA" + parts[2].slice(4); // mangle some bytes
    const corrupted = parts.join(":");
    expect(() => decryptToken(corrupted)).toThrow();
  });

  it("decryption fails when ENCRYPTION_KEY changes", () => {
    const encrypted = encryptToken("original-key-token");

    // Temporarily swap the key
    const original = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    expect(() => decryptToken(encrypted)).toThrow();

    // Restore
    process.env.ENCRYPTION_KEY = original;
  });
});
