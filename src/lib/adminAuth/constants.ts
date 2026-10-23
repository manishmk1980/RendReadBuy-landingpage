/** HttpOnly session cookie for Silver chat campaign operators. */
export const ADMIN_SESSION_COOKIE = "rrb_silver_chat_admin_session";

/**
 * Double-submit CSRF cookie (readable by the login/logout forms).
 * Not a credential; paired with a matching form/header token.
 */
export const ADMIN_CSRF_COOKIE = "rrb_silver_chat_admin_csrf";

/**
 * Cookie Path must be a single prefix. `/admin` would exclude `/api/admin/*`,
 * so both protected pages and auth APIs use Path=/ with name-scoped cookies.
 */
export const ADMIN_COOKIE_PATH = "/";

/** Session lifetime (8 hours). */
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** CSRF token lifetime (aligned with a login page visit). */
export const ADMIN_CSRF_TTL_SECONDS = 60 * 60;

/** In-process login throttle: max failures per IP inside the window. */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const ADMIN_CSRF_HEADER = "x-csrf-token";

/** Operator role for this campaign app only — never Host/Owner/platform. */
export const CAMPAIGN_OPERATOR_ROLE = "rrb_silver_campaign_operator" as const;
