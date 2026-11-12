import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SEPARATOR = "$";

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(normalize(password), salt, KEY_LENGTH, SCRYPT);
  return ["scrypt", String(SCRYPT.N), salt.toString("base64"), key.toString("base64")].join(SEPARATOR);
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(SEPARATOR);
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  if (!Number.isInteger(n) || n < 2) return false;
  try {
    const expected = Buffer.from(parts[3], "base64");
    const actual = scryptSync(normalize(password), Buffer.from(parts[2], "base64"), expected.length, {
      ...SCRYPT,
      N: n,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const TIMING_PAD_HASH = hashPassword("timing-pad-not-a-real-password");

export function verifyPasswordOrPad(password: string, stored: string | null): boolean {
  return verifyPassword(password, stored ?? TIMING_PAD_HASH);
}

function normalize(password: string): string {
  return password.normalize("NFKC");
}
