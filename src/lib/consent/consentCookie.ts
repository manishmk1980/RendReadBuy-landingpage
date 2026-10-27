/**
 * Host-only consent cookie for the Silver Membership campaign page.
 *
 * Phase 1 stores the choice and nothing else. It does not load Google Tag
 * Manager, GA4, gtag.js, or the Meta Pixel, and it never writes a `Domain`
 * attribute (so the cookie is not sent to rentreadbuy.com or any other host).
 * The only cookie this module assigns is `rrb_silver_consent`.
 */

export const CONSENT_COOKIE_NAME = "rrb_silver_consent";

/** Bump to ask for the choice again. Unknown versions are treated as no choice. */
export const CONSENT_COOKIE_VERSION = 1;

/**
 * Provisional retention for `rrb_silver_consent`.
 *
 * 180 days (15,552,000 seconds) is not a confirmed retention period. Legal
 * confirmation against the privacy policy and the retention requirements is
 * still required before this lifetime is treated as final. Cookie settings
 * copy must not present 180 days as settled. If the confirmed
 * lifetime or the cookie version changes, ask for the choice again.
 *
 * F.2B-2 sections 4.3, 4.5 item 7, and 4.7; launch checklist section 3.
 */
export const CONSENT_RETENTION = {
  maxAgeSeconds: 15_552_000,
  approximateDays: 180,
  status: "provisional",
  legalConfirmationRequired: true,
  note: "Provisional: 180 days requires legal confirmation against the privacy policy and retention requirements before it is treated as final.",
} as const;

export type ConsentChoice = "granted" | "denied";

export type ConsentPreferences = {
  analytics: ConsentChoice;
  advertising: ConsentChoice;
};

export type StoredConsent = ConsentPreferences & {
  version: number;
  /** Epoch milliseconds when the visitor saved the choice. */
  chosenAt: number;
};

/** Tracking state when no valid choice is stored. Not the editor's first-open appearance. */
export const DENIED_PREFERENCES: ConsentPreferences = {
  analytics: "denied",
  advertising: "denied",
};

/**
 * Checked appearance in Cookie settings when no valid choice is saved.
 * Opening the dialog with these values does not write a cookie and does not
 * grant analytics or advertising.
 */
export const PRESELECTED_EDITOR_PREFERENCES: ConsentPreferences = {
  analytics: "granted",
  advertising: "granted",
};

const CONSENT_VALUE =
  /^v(\d+)\.analytics\.(granted|denied)\.advertising\.(granted|denied)\.t\.(\d{1,16})$/;

function isChoice(value: string): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

function isWithinRetention(chosenAt: number, now: number): boolean {
  if (!Number.isSafeInteger(chosenAt) || chosenAt < 0) return false;
  const ageMs = now - chosenAt;
  // A slightly future timestamp is clock skew, not a longer lifetime.
  if (ageMs < 0) return true;
  return ageMs <= CONSENT_RETENTION.maxAgeSeconds * 1000;
}

/**
 * Preferences to show in Cookie settings.
 * No valid choice shows both categories checked. That appearance is not
 * stored. A saved choice, including a denied category, is shown exactly.
 */
export function preferencesForEditor(stored: StoredConsent | null): ConsentPreferences {
  if (!stored) return { ...PRESELECTED_EDITOR_PREFERENCES };
  return { analytics: stored.analytics, advertising: stored.advertising };
}

/** Missing, expired, and unreadable values are no choice. */
export function parseConsentValue(raw: string, now = Date.now()): StoredConsent | null {
  const candidates = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) candidates.push(decoded);
  } catch {
    return null;
  }

  for (const candidate of candidates) {
    const match = CONSENT_VALUE.exec(candidate);
    if (!match) continue;
    const version = Number(match[1]);
    const analytics = match[2];
    const advertising = match[3];
    const chosenAt = Number(match[4]);
    if (version !== CONSENT_COOKIE_VERSION) return null;
    if (!isChoice(analytics) || !isChoice(advertising)) return null;
    if (!isWithinRetention(chosenAt, now)) return null;
    return { version, analytics, advertising, chosenAt };
  }

  return null;
}

/** Raw `rrb_silver_consent` value, without reading or rewriting any other cookie. */
export function readRawConsentCookie(cookieHeader: string): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    if (trimmed.slice(0, separator) !== CONSENT_COOKIE_NAME) continue;
    return trimmed.slice(separator + 1);
  }

  return null;
}

export function readConsentFromCookieString(cookieHeader: string, now = Date.now()): StoredConsent | null {
  const raw = readRawConsentCookie(cookieHeader);
  if (!raw) return null;
  return parseConsentValue(raw, now);
}

const CONSENT_SNAPSHOT_MISSING = "missing";
const CONSENT_SNAPSHOT_PENDING = "pending";
const consentListeners = new Set<() => void>();

/** Snapshot for `useSyncExternalStore`. "pending" is server-only and never a cookie value. */
export function consentChoiceSnapshot(): string {
  if (typeof document === "undefined") return CONSENT_SNAPSHOT_MISSING;
  return readRawConsentCookie(document.cookie) ?? CONSENT_SNAPSHOT_MISSING;
}

export function getServerConsentSnapshot(): string {
  return CONSENT_SNAPSHOT_PENDING;
}

export function subscribeToConsent(onChange: () => void): () => void {
  consentListeners.add(onChange);
  return () => consentListeners.delete(onChange);
}

function emitConsentChange() {
  for (const listener of consentListeners) listener();
}

export function isPendingConsentSnapshot(snapshot: string): boolean {
  return snapshot === CONSENT_SNAPSHOT_PENDING;
}

/** `document.cookie` assignment. Host-only: no `Domain` attribute. */
export function serializeConsentCookie(stored: StoredConsent): string {
  const payload = `v${stored.version}.analytics.${stored.analytics}.advertising.${stored.advertising}.t.${stored.chosenAt}`;
  return [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}`,
    "Path=/",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${CONSENT_RETENTION.maxAgeSeconds}`,
  ].join("; ");
}

export function readStoredConsent(now = Date.now()): StoredConsent | null {
  if (typeof document === "undefined") return null;
  return readConsentFromCookieString(document.cookie, now);
}

/**
 * Overwrites only `rrb_silver_consent`. Does not read, clear, or rewrite any
 * other cookie. Does not reload the page.
 */
export function writeStoredConsent(preferences: ConsentPreferences, now = Date.now()): StoredConsent {
  if (!isChoice(preferences.analytics) || !isChoice(preferences.advertising)) {
    throw new Error("Invalid consent choice");
  }
  if (typeof document === "undefined") {
    throw new Error("Consent choices are saved in the browser only");
  }

  const stored: StoredConsent = {
    version: CONSENT_COOKIE_VERSION,
    analytics: preferences.analytics,
    advertising: preferences.advertising,
    chosenAt: now,
  };
  document.cookie = serializeConsentCookie(stored);
  emitConsentChange();
  return stored;
}
