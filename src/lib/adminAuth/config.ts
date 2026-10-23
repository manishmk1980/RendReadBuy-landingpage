/**
 * Server-only operator credentials for Silver chat administration.
 * Never import from Client Components. Values come from non-NEXT_PUBLIC env.
 */

export type AdminAuthConfig =
  | { configured: true; username: string; passwordHash: string; sessionSecret: string }
  | { configured: false; reason: string };

const MIN_SECRET_BYTES = 32;

function secretByteLength(secret: string): number {
  return Buffer.byteLength(secret, "utf8");
}

/**
 * Fail closed: missing or weak config means login always rejects and
 * protected routes treat the operator as unauthenticated.
 */
type EnvLike = Record<string, string | undefined>;

export function readAdminAuthConfig(
  env: EnvLike = process.env,
): AdminAuthConfig {
  const username = env.CHAT_ADMIN_USERNAME?.trim();
  const passwordHash = env.CHAT_ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.CHAT_ADMIN_SESSION_SECRET?.trim();

  if (!username || !passwordHash || !sessionSecret) {
    return {
      configured: false,
      reason: "CHAT_ADMIN_USERNAME, CHAT_ADMIN_PASSWORD_HASH, and CHAT_ADMIN_SESSION_SECRET must all be set.",
    };
  }

  if (secretByteLength(sessionSecret) < MIN_SECRET_BYTES) {
    return {
      configured: false,
      reason: `CHAT_ADMIN_SESSION_SECRET must be at least ${MIN_SECRET_BYTES} bytes.`,
    };
  }

  if (!passwordHash.startsWith("$scrypt$")) {
    return {
      configured: false,
      reason: "CHAT_ADMIN_PASSWORD_HASH must be a $scrypt$ PHC-style hash (not plaintext).",
    };
  }

  return { configured: true, username, passwordHash, sessionSecret };
}

/** Convenience for call sites that already checked configured. */
export function requireAdminAuthConfig(
  env: EnvLike = process.env,
): Extract<AdminAuthConfig, { configured: true }> | null {
  const config = readAdminAuthConfig(env);
  return config.configured ? config : null;
}

export function isAdminAuthConfigured(env: EnvLike = process.env): boolean {
  return readAdminAuthConfig(env).configured;
}

/** Re-export for tests that need to assert env names without hard-coding. */
export const ADMIN_ENV_NAMES = [
  "CHAT_ADMIN_USERNAME",
  "CHAT_ADMIN_PASSWORD_HASH",
  "CHAT_ADMIN_SESSION_SECRET",
] as const;
