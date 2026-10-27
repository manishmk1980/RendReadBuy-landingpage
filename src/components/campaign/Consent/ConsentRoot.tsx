"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { campaignCopy } from "@/config/campaign";
import { links } from "@/config/links";
import { sharedChatDisclosure } from "@/config/sharedChat";
import {
  consentChoiceSnapshot,
  getServerConsentSnapshot,
  isPendingConsentSnapshot,
  parseConsentValue,
  preferencesForEditor,
  readStoredConsent,
  subscribeToConsent,
  writeStoredConsent,
  type ConsentPreferences,
} from "@/lib/consent";
import { COOKIE_SETTINGS_ID, ConsentContext, type ConsentApi } from "./consent-context";
import styles from "./Consent.module.css";

type ConsentMode = "pending" | "hidden" | "banner" | "preferences";

const MANAGE_PREFERENCES_ID = "rrb-manage-preferences";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function restoreFocus(id: string) {
  const preferred = document.getElementById(id);
  if (preferred) {
    preferred.focus();
    return;
  }
  document.getElementById(COOKIE_SETTINGS_ID)?.focus();
}

/**
 * Campaign-page consent. The choice is stored in the host-only cookie and
 * applied on this document; the page is not reloaded, and no tag loader runs.
 * The 180-day lifetime stays in the cookie module, where it is marked as
 * provisional pending legal confirmation — this UI does not state that period.
 * Checked switches before a saved choice are a suggestion only. They do not
 * write the cookie, and tracking stays denied until the visitor saves a choice.
 */
export function ConsentRoot({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToConsent, consentChoiceSnapshot, getServerConsentSnapshot);
  const [panel, setPanel] = useState<"closed" | "preferences">("closed");
  const [draft, setDraft] = useState<ConsentPreferences>(preferencesForEditor(null));
  const [returnFocusId, setReturnFocusId] = useState(COOKIE_SETTINGS_ID);
  const stored = isPendingConsentSnapshot(snapshot) ? null : parseConsentValue(snapshot);
  const mode: ConsentMode =
    panel === "preferences" ? "preferences" : isPendingConsentSnapshot(snapshot) ? "pending" : stored ? "hidden" : "banner";

  const openPreferences = useCallback((focusId: string) => {
    setReturnFocusId(focusId);
    setDraft(preferencesForEditor(readStoredConsent()));
    setPanel("preferences");
  }, []);

  const api = useMemo<ConsentApi>(
    () => ({
      openCookieSettings: () => openPreferences(COOKIE_SETTINGS_ID),
    }),
    [openPreferences],
  );

  const dismissPreferences = useCallback(() => {
    setPanel("closed");
  }, []);

  const save = (preferences: ConsentPreferences) => {
    writeStoredConsent(preferences);
    setPanel("closed");
  };

  useEffect(() => {
    if (mode !== "preferences") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  return (
    <ConsentContext.Provider value={api}>
      <div data-consent-mode={mode}>
        <div {...(mode === "preferences" ? { inert: true } : {})}>{children}</div>
        {mode === "banner" ? (
          <Banner
            onAccept={() => save({ analytics: "granted", advertising: "granted" })}
            onReject={() => save({ analytics: "denied", advertising: "denied" })}
            onManage={() => openPreferences(MANAGE_PREFERENCES_ID)}
          />
        ) : null}
        {mode === "preferences" ? (
          <PreferencesDialog
            draft={draft}
            onDraft={setDraft}
            onSave={() => save(draft)}
            onDismiss={dismissPreferences}
            returnFocusId={returnFocusId}
          />
        ) : null}
      </div>
    </ConsentContext.Provider>
  );
}

function Banner({
  onAccept,
  onReject,
  onManage,
}: {
  onAccept: () => void;
  onReject: () => void;
  onManage: () => void;
}) {
  const copy = campaignCopy.consent;
  const titleId = useId();

  return (
    <section className={styles.banner} aria-labelledby={titleId} data-pw-chat-avoid="">
      <div className={styles.bannerInner}>
        <div className={styles.copy}>
          <p id={titleId} className={styles.title}>
            {copy.bannerTitle}
          </p>
          <p className={styles.body}>{copy.bannerBody}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onAccept}>
            {copy.acceptAll}
          </button>
          <button type="button" className={styles.secondary} onClick={onReject}>
            {copy.rejectOptional}
          </button>
          <button type="button" id={MANAGE_PREFERENCES_ID} className={styles.quiet} onClick={onManage}>
            {copy.managePreferences}
          </button>
        </div>
      </div>
    </section>
  );
}

function PreferencesDialog({
  draft,
  onDraft,
  onSave,
  onDismiss,
  returnFocusId,
}: {
  draft: ConsentPreferences;
  onDraft: (update: (current: ConsentPreferences) => ConsentPreferences) => void;
  onSave: () => void;
  onDismiss: () => void;
  returnFocusId: string;
}) {
  const copy = campaignCopy.consent;
  const chatCopy = sharedChatDisclosure;
  const titleId = useId();
  const bodyId = useId();
  const disclaimerId = useId();
  const chatProcessingId = useId();
  const chatSafetyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const focusId = returnFocusId;
    dialog?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocus(focusId);
    };
  }, [onDismiss, returnFocusId]);

  const toggle = (key: keyof ConsentPreferences) => (event: ChangeEvent<HTMLInputElement>) => {
    const choice = event.target.checked ? "granted" : "denied";
    onDraft((current) => ({ ...current, [key]: choice }));
  };

  return (
    <div className={styles.backdrop} onClick={onDismiss}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${bodyId} ${disclaimerId} ${chatProcessingId} ${chatSafetyId}`}
        tabIndex={-1}
        data-pw-chat-avoid=""
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className={styles.title}>
          {copy.dialogTitle}
        </p>
        <p id={bodyId} className={styles.body}>
          {copy.dialogBody}
        </p>
        <div className={styles.preferences}>
          <PreferenceSwitch
            label={copy.analyticsLabel}
            hint={copy.analyticsHint}
            checked={draft.analytics === "granted"}
            onChange={toggle("analytics")}
          />
          <PreferenceSwitch
            label={copy.advertisingLabel}
            hint={copy.advertisingHint}
            checked={draft.advertising === "granted"}
            onChange={toggle("advertising")}
          />
        </div>
        <p id={disclaimerId} className={styles.disclaimer}>
          {copy.preferencesDisclaimer}
        </p>
        <p id={chatProcessingId} className={styles.disclaimer}>
          {chatCopy.processing}
        </p>
        <p id={chatSafetyId} className={styles.disclaimer}>
          {chatCopy.safetyLead}{" "}
          <a href={links.privacy.href} className={styles.disclaimerLink}>
            {chatCopy.privacyLabel}
          </a>{" "}
          {chatCopy.safetyTail}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onSave}>
            {copy.save}
          </button>
          <button type="button" className={styles.secondary} onClick={onDismiss}>
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreferenceSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={styles.preference}>
      <span className={styles.preferenceCopy}>
        <span className={styles.preferenceLabel}>{label}</span>
        <span className={styles.preferenceHint}>{hint}</span>
      </span>
      <input className={styles.switch} type="checkbox" role="switch" checked={checked} onChange={onChange} />
    </label>
  );
}
