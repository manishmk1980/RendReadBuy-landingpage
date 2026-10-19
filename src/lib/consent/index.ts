export {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_RETENTION,
  DENIED_PREFERENCES,
  PRESELECTED_EDITOR_PREFERENCES,
  consentChoiceSnapshot,
  getServerConsentSnapshot,
  isPendingConsentSnapshot,
  parseConsentValue,
  preferencesForEditor,
  readConsentFromCookieString,
  readStoredConsent,
  serializeConsentCookie,
  subscribeToConsent,
  writeStoredConsent,
} from "./consentCookie";
export type { ConsentChoice, ConsentPreferences, StoredConsent } from "./consentCookie";
