import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * PHC-ish scrypt encoding:
 * `$scrypt$n=<N>,r=<r>,p=<p>$<base64url_salt>$<base64url_hash>`
 *
 * Used only for CHAT_ADMIN_PASSWORD_HASH. Never store plaintext passwords.
 */

const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

const HASH_PATTERN =
  /^\$scrypt\$n=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Buffer {
  // maxmem must cover scrypt's internal allocation for the chosen N.
  const maxmem = 128 * r * n * 2 + 64 * 1024 * 1024;
  return scryptSync(password, salt, KEY_LEN, { N: n, r, p, maxmem });
}

/** Generate a PHC-style scrypt hash for CHAT_ADMIN_PASSWORD_HASH. */
export function hashPassword(
  password: string,
  options?: { n?: number; r?: number; p?: number; salt?: Buffer },
): string {
  if (!password) {
    throw new Error("Password must not be empty.");
  }
  const n = options?.n ?? DEFAULT_N;
  const r = options?.r ?? DEFAULT_R;
  const p = options?.p ?? DEFAULT_P;
  const salt = options?.salt ?? randomBytes(SALT_LEN);
  const hash = derive(password, salt, n, r, p);
  return `$scrypt$n=${n},r=${r},p=${p}$${b64url(salt)}$${b64url(hash)}`;
}

/**
 * Timing-safe verification against a stored scrypt hash.
 * Returns false for malformed hashes or wrong passwords.
 */
export function verifyPassword(password: string, encodedHash: string): boolean {
  const match = HASH_PATTERN.exec(encodedHash);
  if (!match) return false;

  const n = Number(match[1]);
  const r = Number(match[2]);
  const p = Number(match[3]);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = fromB64url(match[4]);
    expected = fromB64url(match[5]);
  } catch {
    return false;
  }

  if (salt.length < 8 || expected.length !== KEY_LEN) return false;

  let actual: Buffer;
  try {
    actual = derive(password, salt, n, r, p);
  } catch {
    return false;
  }

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Timing-safe string compare for usernames (pads to equal length).
 * Never short-circuit on length alone in a way that leaks via early return
 * of crypto compare; equalize buffers first.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  const len = Math.max(aBuf.length, bBuf.length, 1);
  const aPad = Buffer.alloc(len);
  const bPad = Buffer.alloc(len);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  const equal = timingSafeEqual(aPad, bPad);
  return equal && aBuf.length === bBuf.length;
}
