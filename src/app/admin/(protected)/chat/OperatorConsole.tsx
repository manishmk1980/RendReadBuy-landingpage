"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { getOrCreateConsoleInstanceId } from "@/lib/chatOps/consoleInstance";
import styles from "../../admin.module.css";
import {
  adminGet,
  adminMutate,
  errorMessage,
  isAbortError,
  readCsrfCookie,
} from "./adminFetch";
import {
  type ConversationData,
  type DashboardConversation,
  displayActivityAt,
  displayIntent,
  displayOriginatingPage,
  displayVisitorLabel,
  displayVisitorPresence,
  messageActor,
  messageText,
} from "./conversationFields";

const HEARTBEAT_INTERVAL_MS = 60_000;

type AdminSurface =
  | "overview"
  | "conversations"
  | "availability"
  | "diagnostics";

type InboxFilter = "active" | "archived";

type ConversationOpsStatus =
  | "not_configured"
  | "ready"
  | "unavailable"
  | "unauthorized";

type ReadinessResponse = {
  ok?: boolean;
  conversationOps?: ConversationOpsStatus;
  ready?: boolean;
  productionReady?: boolean;
  detail?: string;
  config?: {
    opsConfigured?: boolean;
    connectCredentialConfigured?: boolean;
  };
  error?: { message?: string };
};

type DashboardData = {
  recentConversations?: DashboardConversation[];
  service?: { status?: string; chatEnabled?: boolean };
  team?: { onlineCount?: number; status?: string };
};

type PresenceResponse = {
  ok?: boolean;
  contributing?: boolean;
  expiresInMs?: number;
  presencePolicy?: string;
  presencePolicyDegraded?: boolean;
  cleared?: number;
  error?: { message?: string; code?: string };
};

type DiagnosticsPayload = {
  ok?: boolean;
  requestId?: string;
  tenant?: { key?: string; displayName?: string; market?: string };
  generatedAt?: string;
  productionReady?: boolean;
  data?: unknown;
  error?: { message?: string };
};

const SURFACES: { id: AdminSurface; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "conversations", label: "Conversations" },
  { id: "availability", label: "Operator Availability" },
  { id: "diagnostics", label: "Diagnostics" },
];

const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived (read)" },
];

function moveIndex(
  index: number,
  length: number,
  key: string,
): number | null {
  if (length <= 0 || index < 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (index + 1) % length;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (index - 1 + length) % length;
  }
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

export function OperatorConsole() {
  const tabListId = useId();
  const inboxTabListId = useId();
  const [surface, setSurface] = useState<AdminSurface>("overview");
  const [inbox, setInbox] = useState<InboxFilter>("active");
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [started, setStarted] = useState(false);
  const [online, setOnline] = useState(false);
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [presenceDetail, setPresenceDetail] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [presenceSuccess, setPresenceSuccess] = useState<string | null>(null);
  const [expiresInMs, setExpiresInMs] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(
    null,
  );
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  const onlineRef = useRef(false);
  const presenceBusyRef = useRef(false);
  const presenceEpochRef = useRef(0);
  const heartbeatInFlightRef = useRef(false);
  const consoleInstanceIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inboxRequestIdRef = useRef(0);
  const conversationRequestIdRef = useRef(0);
  const inboxAbortRef = useRef<AbortController | null>(null);
  const conversationAbortRef = useRef<AbortController | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    consoleInstanceIdRef.current = getOrCreateConsoleInstanceId();
  }, []);

  const stopHeartbeatLoop = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const applyConfirmedOffline = useCallback(
    (options?: { error?: string; clearSuccess?: boolean }) => {
      stopHeartbeatLoop();
      setOnline(false);
      setExpiresInMs(null);
      setPresenceDetail("Offline for this console tab.");
      if (options?.error) {
        setPresenceError(options.error);
        setPresenceSuccess(null);
      } else if (options?.clearSuccess) {
        setPresenceSuccess(null);
      }
    },
    [stopHeartbeatLoop],
  );

  const sendHeartbeat = useCallback(
    async (options?: { epoch?: number }): Promise<boolean> => {
      const epoch = options?.epoch ?? presenceEpochRef.current;
      if (heartbeatInFlightRef.current) {
        return false;
      }
      heartbeatInFlightRef.current = true;
      try {
        const consoleInstanceId =
          consoleInstanceIdRef.current ?? getOrCreateConsoleInstanceId();
        consoleInstanceIdRef.current = consoleInstanceId;
        const { status, body } = await adminMutate<PresenceResponse>(
          "/api/admin/chat/presence/heartbeat",
          { consoleInstanceId },
        );
        if (epoch !== presenceEpochRef.current) {
          return false;
        }
        if (status === 401) {
          presenceEpochRef.current += 1;
          applyConfirmedOffline({
            error: "Session expired. Sign in again.",
          });
          return false;
        }
        if (status === 0 || status >= 400) {
          if (onlineRef.current) {
            presenceEpochRef.current += 1;
            applyConfirmedOffline({
              error: errorMessage(body, "Presence heartbeat failed."),
            });
          } else {
            setPresenceError(errorMessage(body, "Presence heartbeat failed."));
            setPresenceSuccess(null);
          }
          return false;
        }
        setPresenceError(null);
        setExpiresInMs(
          typeof body.expiresInMs === "number" ? body.expiresInMs : null,
        );
        const policy = body.presencePolicy ?? "unknown";
        const degraded = body.presencePolicyDegraded
          ? " (policy degraded)"
          : "";
        setPresenceDetail(`Contributing · policy ${policy}${degraded}`);
        return true;
      } finally {
        heartbeatInFlightRef.current = false;
      }
    },
    [applyConfirmedOffline],
  );

  const sendOffline = useCallback(
    async (
      bestEffort = false,
      options?: { epoch?: number },
    ): Promise<boolean> => {
      const epoch = options?.epoch ?? presenceEpochRef.current;
      const consoleInstanceId =
        consoleInstanceIdRef.current ?? getOrCreateConsoleInstanceId();
      const { status, body } = await adminMutate<PresenceResponse>(
        "/api/admin/chat/presence/offline",
        { consoleInstanceId, notAfterMs: Date.now() },
      );
      if (epoch !== presenceEpochRef.current) {
        return false;
      }
      if (!bestEffort && status === 401) {
        setPresenceError("Session expired. Sign in again.");
        setPresenceSuccess(null);
        return false;
      }
      if (!bestEffort && (status === 0 || status >= 400)) {
        setPresenceError(errorMessage(body, "Could not go Offline."));
        setPresenceSuccess(null);
        return false;
      }
      if (status > 0 && status < 400) {
        setPresenceError(null);
        setPresenceDetail("Offline for this console tab.");
        setExpiresInMs(null);
        return true;
      }
      return bestEffort;
    },
    [],
  );

  const startHeartbeatLoop = useCallback(() => {
    stopHeartbeatLoop();
    heartbeatTimerRef.current = setInterval(() => {
      if (!onlineRef.current || presenceBusyRef.current) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void sendHeartbeat({ epoch: presenceEpochRef.current });
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat, stopHeartbeatLoop]);

  const goOnline = useCallback(async () => {
    if (presenceBusyRef.current || onlineRef.current) return;
    presenceBusyRef.current = true;
    setPresenceBusy(true);
    setPresenceError(null);
    setPresenceSuccess(null);
    const epoch = ++presenceEpochRef.current;
    try {
      const ok = await sendHeartbeat({ epoch });
      if (epoch !== presenceEpochRef.current) return;
      if (!ok) {
        // Stay Offline until Central confirms contribution.
        setOnline(false);
        return;
      }
      setOnline(true);
      setPresenceSuccess("You are Online for this console tab.");
      startHeartbeatLoop();
    } finally {
      // Always release the transition lock — epoch bumps (e.g. 401) must not
      // leave presenceBusy stuck and block retries. Stale-response guards above
      // still skip applying Online/Offline confirmation when superseded.
      presenceBusyRef.current = false;
      setPresenceBusy(false);
    }
  }, [sendHeartbeat, startHeartbeatLoop]);

  const goOffline = useCallback(async () => {
    if (presenceBusyRef.current || !onlineRef.current) return;
    presenceBusyRef.current = true;
    setPresenceBusy(true);
    setPresenceError(null);
    setPresenceSuccess(null);
    const epoch = ++presenceEpochRef.current;
    // Invalidate in-flight heartbeats and pause renewals while Offline confirms.
    stopHeartbeatLoop();
    try {
      const ok = await sendOffline(false, { epoch });
      if (epoch !== presenceEpochRef.current) return;
      if (!ok) {
        // Remain Online with confirmed connectivity until Offline succeeds.
        if (onlineRef.current) {
          startHeartbeatLoop();
        }
        return;
      }
      setOnline(false);
      setPresenceSuccess("You are Offline for this console tab.");
    } finally {
      // Always release the transition lock — see goOnline finally.
      presenceBusyRef.current = false;
      setPresenceBusy(false);
    }
  }, [sendOffline, startHeartbeatLoop, stopHeartbeatLoop]);

  const togglePresence = useCallback(async () => {
    if (presenceBusyRef.current) return;
    if (onlineRef.current) {
      await goOffline();
    } else {
      await goOnline();
    }
  }, [goOffline, goOnline]);

  useEffect(() => {
    const onPageHide = () => {
      if (!onlineRef.current) return;
      presenceEpochRef.current += 1;
      stopHeartbeatLoop();
      const consoleInstanceId =
        consoleInstanceIdRef.current ?? getOrCreateConsoleInstanceId();
      const csrfToken = readCsrfCookie();
      const payload = JSON.stringify({
        consoleInstanceId,
        notAfterMs: Date.now(),
        csrfToken,
      });
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/admin/chat/presence/offline", blob);
          setOnline(false);
          return;
        }
      } catch {
        // fall through to best-effort fetch
      }
      void sendOffline(true, { epoch: presenceEpochRef.current });
      setOnline(false);
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!onlineRef.current || presenceBusyRef.current) return;
      void sendHeartbeat({ epoch: presenceEpochRef.current });
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      stopHeartbeatLoop();
      inboxAbortRef.current?.abort();
      conversationAbortRef.current?.abort();
      if (onlineRef.current) {
        presenceEpochRef.current += 1;
        void sendOffline(true, { epoch: presenceEpochRef.current });
      }
    };
  }, [sendHeartbeat, sendOffline, stopHeartbeatLoop]);

  const loadDashboard = useCallback(async (inboxFilter: InboxFilter) => {
    inboxAbortRef.current?.abort();
    const controller = new AbortController();
    inboxAbortRef.current = controller;
    const requestId = ++inboxRequestIdRef.current;
    setLoadingInbox(true);
    try {
      const { status, body } = await adminGet<{
        ok?: boolean;
        data?: DashboardData;
        error?: { message?: string };
      }>(`/api/admin/chat/dashboard?inbox=${inboxFilter}`, {
        signal: controller.signal,
      });
      if (requestId !== inboxRequestIdRef.current) return;
      if (status === 0 || status >= 400) {
        setError(errorMessage(body, "Dashboard unavailable."));
        setDashboard(null);
        return;
      }
      setDashboard(body.data ?? null);
      setError(null);
    } catch (err) {
      if (isAbortError(err) || requestId !== inboxRequestIdRef.current) return;
      setError("Dashboard unavailable.");
      setDashboard(null);
    } finally {
      if (requestId === inboxRequestIdRef.current) {
        setLoadingInbox(false);
      }
    }
  }, []);

  const refreshStatus = useCallback(
    async (options?: { announce?: boolean }) => {
      const announce = options?.announce ?? true;
      setBusy(true);
      setError(null);
      if (announce) setSuccess(null);
      try {
        const { status, body } = await adminGet<ReadinessResponse>(
          "/api/admin/chat/readiness",
        );
        if (status === 401) {
          setError("Session expired. Sign in again.");
          setReadiness(null);
          setStarted(true);
          return;
        }
        if (status === 0 || status >= 400) {
          setError(errorMessage(body, "Readiness check failed."));
          setReadiness(null);
          setDashboard(null);
          setConversation(null);
          setSelectedId(null);
          setStarted(true);
          return;
        }
        setReadiness(body);
        setStarted(true);
        if (body.ready) {
          await loadDashboard(inbox);
          if (announce) {
            setSuccess("Operational readiness confirmed for this tenant.");
          }
        } else {
          setDashboard(null);
          setConversation(null);
          setSelectedId(null);
          if (announce) setSuccess(null);
        }
      } finally {
        setBusy(false);
      }
    },
    [inbox, loadDashboard],
  );

  useEffect(() => {
    // Session-gated readiness probe once per console entry.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once remote probe
    void refreshStatus({ announce: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const loadConversation = useCallback(async (sessionId: string) => {
    conversationAbortRef.current?.abort();
    const controller = new AbortController();
    conversationAbortRef.current = controller;
    const requestId = ++conversationRequestIdRef.current;
    setLoadingConversation(true);
    try {
      const { status, body } = await adminGet<{
        ok?: boolean;
        data?: ConversationData;
        error?: { message?: string };
      }>(
        `/api/admin/chat/conversation?sessionId=${encodeURIComponent(sessionId)}`,
        { signal: controller.signal },
      );
      if (requestId !== conversationRequestIdRef.current) return;
      if (selectedIdRef.current !== sessionId) return;
      if (status === 0 || status >= 400) {
        setError(errorMessage(body, "Conversation unavailable."));
        setConversation(null);
        return;
      }
      setConversation(body.data ?? null);
      setError(null);
    } catch (err) {
      if (isAbortError(err) || requestId !== conversationRequestIdRef.current) {
        return;
      }
      setError("Conversation unavailable.");
      setConversation(null);
    } finally {
      if (requestId === conversationRequestIdRef.current) {
        setLoadingConversation(false);
      }
    }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    try {
      const { status, body } = await adminGet<DiagnosticsPayload>(
        "/api/admin/chat/diagnostics",
      );
      if (status === 401) {
        setDiagnosticsError("Session expired. Sign in again.");
        setDiagnostics(null);
        return;
      }
      if (status === 0 || status >= 400) {
        setDiagnosticsError(errorMessage(body, "Diagnostics unavailable."));
        setDiagnostics(null);
        return;
      }
      setDiagnostics(body);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  const openSurface = useCallback(
    (next: AdminSurface) => {
      setSurface(next);
      // One automatic fetch per surface entry — never tied to loading/error
      // state, so HTTP/network failures cannot retrigger themselves.
      if (next === "diagnostics") {
        void loadDiagnostics();
      }
      if (next === "conversations" && readiness?.ready) {
        void loadDashboard(inbox);
      }
    },
    [inbox, loadDashboard, loadDiagnostics, readiness?.ready],
  );

  function onSelect(sessionId: string) {
    setSelectedId(sessionId);
    selectedIdRef.current = sessionId;
    setReplyText("");
    setSuccess(null);
    void loadConversation(sessionId);
  }

  async function onReply() {
    if (!selectedId || !replyText.trim()) return;
    setBusy(true);
    setSuccess(null);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/reply", {
        sessionId: selectedId,
        text: replyText.trim(),
      });
      if (status === 0 || status >= 400) {
        setError(errorMessage(body, "Reply failed."));
        return;
      }
      setReplyText("");
      setSuccess("Reply sent.");
      await loadConversation(selectedId);
      await loadDashboard(inbox);
    } finally {
      setBusy(false);
    }
  }

  async function onResolve() {
    if (!selectedId) return;
    setBusy(true);
    setSuccess(null);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/resolve", { sessionId: selectedId });
      if (status === 0 || status >= 400) {
        setError(errorMessage(body, "Resolve failed."));
        return;
      }
      setSuccess("Conversation resolved.");
      await loadConversation(selectedId);
      await loadDashboard(inbox);
    } finally {
      setBusy(false);
    }
  }

  async function onReopen() {
    if (!selectedId) return;
    setBusy(true);
    setSuccess(null);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/reopen", { sessionId: selectedId });
      if (status === 0 || status >= 400) {
        setError(errorMessage(body, "Reopen failed."));
        return;
      }
      setSuccess("Conversation reopened.");
      await loadConversation(selectedId);
      await loadDashboard(inbox);
    } finally {
      setBusy(false);
    }
  }

  const status = readiness?.conversationOps ?? "not_configured";
  const conversations = dashboard?.recentConversations ?? [];
  const attentionCount = conversations.filter((c) => c.needsAttention).length;
  const presenceControlLabel = online ? "Go offline" : "Go online";
  const presenceDisabledReason = presenceBusy
    ? "Waiting for the presence service…"
    : null;

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const order = SURFACES.map((s) => s.id);
    const index = order.indexOf(surface);
    const next = moveIndex(index, order.length, event.key);
    if (next == null) return;
    event.preventDefault();
    const nextId = order[next]!;
    openSurface(nextId);
    document.getElementById(`${tabListId}-${nextId}`)?.focus();
  }

  function onInboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const order = INBOX_FILTERS.map((item) => item.id);
    const index = order.indexOf(inbox);
    const next = moveIndex(index, order.length, event.key);
    if (next == null) return;
    event.preventDefault();
    const nextId = order[next]!;
    selectInbox(nextId);
    document.getElementById(`${inboxTabListId}-${nextId}`)?.focus();
  }

  function selectInbox(value: InboxFilter) {
    setInbox(value);
    setSelectedId(null);
    selectedIdRef.current = null;
    setConversation(null);
    if (readiness?.ready) {
      void loadDashboard(value);
    }
  }

  return (
    <div className={styles.console}>
      <nav className={styles.surfaceNav} aria-label="Chat administration">
        <div
          role="tablist"
          aria-orientation="horizontal"
          className={styles.tabList}
          onKeyDown={onTabKeyDown}
        >
          {SURFACES.map((item) => {
            const selected = surface === item.id;
            return (
              <button
                key={item.id}
                id={`${tabListId}-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tabListId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                className={selected ? styles.tabActive : styles.tab}
                onClick={() => openSurface(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {error ? (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setError(null);
              void refreshStatus({ announce: true });
            }}
          >
            Retry readiness
          </button>
        </p>
      ) : null}
      {success ? (
        <p className={styles.success} role="status">
          {success}
        </p>
      ) : null}

      {surface === "overview" ? (
        <section
          id={`${tabListId}-panel-overview`}
          role="tabpanel"
          aria-labelledby={`${tabListId}-overview`}
          className={styles.panel}
        >
          <h2 className={styles.sectionTitle}>Overview</h2>
          <p className={styles.lede}>
            Am I ready to help visitors on this Silver campaign site? Service
            status, attention count, and your Online state for this tab.
          </p>
          {!started || busy ? (
            <p className={styles.loading} aria-live="polite">
              {busy ? "Checking operational readiness…" : "Preparing…"}
            </p>
          ) : (
            <dl className={styles.statusGrid}>
              <div>
                <dt>Conversation ops</dt>
                <dd>{status}</dd>
              </div>
              <div>
                <dt>This tab</dt>
                <dd>{online ? "Online" : "Offline"}</dd>
              </div>
              <div>
                <dt>Needs attention</dt>
                <dd>{readiness?.ready ? attentionCount : "—"}</dd>
              </div>
              <div>
                <dt>Widget visibility</dt>
                <dd>Env-configured (Settings UI in a later wave)</dd>
              </div>
            </dl>
          )}
          {readiness?.detail ? (
            <p className={styles.note}>{readiness.detail}</p>
          ) : null}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.ghost}
              disabled={busy}
              aria-busy={busy}
              onClick={() => void refreshStatus({ announce: true })}
            >
              {busy ? "Checking…" : started ? "Re-check readiness" : "Check readiness"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => openSurface("availability")}
            >
              Manage availability
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => openSurface("diagnostics")}
            >
              Open diagnostics
            </button>
          </div>
        </section>
      ) : null}

      {surface === "availability" ? (
        <section
          id={`${tabListId}-panel-availability`}
          role="tabpanel"
          aria-labelledby={`${tabListId}-availability`}
          className={styles.panel}
        >
          <h2 className={styles.sectionTitle}>Operator Availability</h2>
          <p className={styles.lede}>
            Go online only when you are ready to handle Silver campaign chats.
            Login alone does not mark the team Online. Each browser tab has its
            own presence session. State changes only after the presence service
            confirms.
          </p>
          <dl className={styles.statusGrid}>
            <div>
              <dt>This tab</dt>
              <dd aria-live="polite">{online ? "Online" : "Offline"}</dd>
            </div>
            <div>
              <dt>Heartbeat TTL</dt>
              <dd>
                {expiresInMs != null
                  ? `${Math.round(expiresInMs / 1000)}s`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Detail</dt>
              <dd>{presenceDetail ?? "Not contributing"}</dd>
            </div>
          </dl>
          {presenceError ? (
            <p className={styles.error} role="alert">
              {presenceError}{" "}
              <button
                type="button"
                className={styles.linkButton}
                disabled={presenceBusy}
                onClick={() => void togglePresence()}
              >
                Retry
              </button>
            </p>
          ) : null}
          {presenceSuccess ? (
            <p className={styles.success} role="status">
              {presenceSuccess}
            </p>
          ) : null}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={online ? styles.ghost : styles.submit}
              disabled={presenceBusy}
              aria-busy={presenceBusy}
              aria-describedby={
                presenceDisabledReason ? "presence-disabled-reason" : undefined
              }
              onClick={() => void togglePresence()}
            >
              {presenceBusy ? "Updating…" : presenceControlLabel}
            </button>
          </div>
          {presenceDisabledReason ? (
            <p id="presence-disabled-reason" className={styles.srOnly}>
              {presenceDisabledReason}
            </p>
          ) : null}
          <p className={styles.note}>
            Technical presence policy and Option 1 status live under Diagnostics.
            Heartbeats still record so Host can flip policy after soak.
          </p>
        </section>
      ) : null}

      {surface === "conversations" ? (
        <section
          id={`${tabListId}-panel-conversations`}
          role="tabpanel"
          aria-labelledby={`${tabListId}-conversations`}
          className={styles.panel}
        >
          <h2 className={styles.sectionTitle}>Conversations</h2>
          <p className={styles.lede}>
            Handle enquiries for this tenant. Archived is read-only. Archive and
            delete writes are not granted on Silver.
          </p>
          {!readiness?.ready ? (
            <div className={styles.emptyState}>
              <p>
                Conversation ops are not ready ({status}). Check readiness on
                Overview or Diagnostics, then retry.
              </p>
              <button
                type="button"
                className={styles.ghost}
                disabled={busy}
                onClick={() => void refreshStatus({ announce: true })}
              >
                Re-check readiness
              </button>
            </div>
          ) : (
            <>
              <div
                className={styles.inboxTabs}
                role="tablist"
                aria-label="Inbox filter"
                aria-orientation="horizontal"
                onKeyDown={onInboxKeyDown}
              >
                {INBOX_FILTERS.map((item) => {
                  const selected = inbox === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`${inboxTabListId}-${item.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`${inboxTabListId}-panel`}
                      tabIndex={selected ? 0 : -1}
                      className={
                        selected ? styles.inboxTabActive : styles.inboxTab
                      }
                      onClick={() => selectInbox(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div
                id={`${inboxTabListId}-panel`}
                role="tabpanel"
                aria-label={`${inbox} conversations`}
                className={styles.inboxLayout}
              >
                <ul className={styles.conversationList} aria-busy={loadingInbox}>
                  {loadingInbox ? (
                    <li className={styles.loading}>Loading conversations…</li>
                  ) : null}
                  {!loadingInbox &&
                    conversations.map((item) => {
                      const id = item.sessionId ?? "";
                      if (!id) return null;
                      const selected = selectedId === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className={
                              selected
                                ? styles.conversationActive
                                : styles.conversationItem
                            }
                            aria-current={selected ? "true" : undefined}
                            onClick={() => onSelect(id)}
                          >
                            <span className={styles.conversationMeta}>
                              {item.status ?? "open"}
                              {item.needsAttention ? " · needs attention" : ""}
                              {" · "}
                              {displayVisitorLabel(item)}
                            </span>
                            <span className={styles.conversationPreview}>
                              {item.lastMessagePreview ?? "No preview"}
                            </span>
                            <span className={styles.conversationMeta}>
                              Intent: {displayIntent(item)} · Page:{" "}
                              {displayOriginatingPage(item)}
                            </span>
                            <span className={styles.conversationMeta}>
                              Visitor: {displayVisitorPresence(item)} ·{" "}
                              {displayActivityAt(item)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  {!loadingInbox && conversations.length === 0 ? (
                    <li className={styles.emptyState}>
                      No {inbox} conversations.
                    </li>
                  ) : null}
                </ul>

                <div className={styles.conversationDetail}>
                  {loadingConversation ? (
                    <p className={styles.loading} aria-live="polite">
                      Loading conversation…
                    </p>
                  ) : null}
                  {!loadingConversation && conversation ? (
                    <>
                      <dl className={styles.detailMeta}>
                        <div>
                          <dt>Status</dt>
                          <dd>{conversation.status ?? "unknown"}</dd>
                        </div>
                        <div>
                          <dt>Visitor</dt>
                          <dd>{displayVisitorLabel(conversation)}</dd>
                        </div>
                        <div>
                          <dt>Intent</dt>
                          <dd>{displayIntent(conversation)}</dd>
                        </div>
                        <div>
                          <dt>Page</dt>
                          <dd>{displayOriginatingPage(conversation)}</dd>
                        </div>
                        <div>
                          <dt>Visitor presence</dt>
                          <dd>{displayVisitorPresence(conversation)}</dd>
                        </div>
                      </dl>
                      <ol className={styles.transcript}>
                        {(conversation.messages ?? []).map((message, index) => (
                          <li key={message.id ?? `${index}`}>
                            <strong>{messageActor(message)}</strong>
                            <p>{messageText(message)}</p>
                          </li>
                        ))}
                      </ol>
                      {inbox === "archived" ? (
                        <p className={styles.note}>
                          Archived inbox is read-only on Silver. Resolve and
                          reopen remain available on active conversations when
                          Central returns them as open.
                        </p>
                      ) : (
                        <div className={styles.replyBox}>
                          <label className={styles.label} htmlFor="reply-text">
                            Reply
                            <textarea
                              id="reply-text"
                              className={styles.textarea}
                              rows={3}
                              value={replyText}
                              onChange={(event) =>
                                setReplyText(event.target.value)
                              }
                              disabled={busy}
                            />
                          </label>
                          <div className={styles.actionRow}>
                            <button
                              type="button"
                              className={styles.submit}
                              disabled={busy || !replyText.trim()}
                              aria-busy={busy}
                              onClick={() => void onReply()}
                            >
                              {busy ? "Working…" : "Send reply"}
                            </button>
                            <button
                              type="button"
                              className={styles.ghost}
                              disabled={busy}
                              onClick={() => void onResolve()}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className={styles.ghost}
                              disabled={busy}
                              onClick={() => void onReopen()}
                            >
                              Reopen
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                  {!loadingConversation && !conversation ? (
                    <p className={styles.lede}>
                      Select a conversation to view the transcript.
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {surface === "diagnostics" ? (
        <section
          id={`${tabListId}-panel-diagnostics`}
          role="tabpanel"
          aria-labelledby={`${tabListId}-diagnostics`}
          className={styles.panel}
        >
          <h2 className={styles.sectionTitle}>Diagnostics</h2>
          <p className={styles.lede}>
            Technical readiness, scopes, Connect health, and presence policy.
            Prefer operator language on the other surfaces.
          </p>
          {diagnosticsLoading ? (
            <p className={styles.loading} aria-live="polite">
              Loading diagnostics…
            </p>
          ) : null}
          {diagnosticsError ? (
            <p className={styles.error} role="alert">
              {diagnosticsError}{" "}
              <button
                type="button"
                className={styles.linkButton}
                disabled={diagnosticsLoading}
                onClick={() => void loadDiagnostics()}
              >
                Retry
              </button>
            </p>
          ) : null}
          {diagnostics ? (
            <>
              <dl className={styles.statusGrid}>
                <div>
                  <dt>Request id</dt>
                  <dd>{diagnostics.requestId ?? "—"}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd>{diagnostics.tenant?.key ?? "—"}</dd>
                </div>
                <div>
                  <dt>Generated</dt>
                  <dd>{diagnostics.generatedAt ?? "—"}</dd>
                </div>
                <div>
                  <dt>Production ready</dt>
                  <dd>
                    {diagnostics.productionReady
                      ? "yes"
                      : "no — enable shared auth store on multi-instance hosts"}
                  </dd>
                </div>
                <div>
                  <dt>Ops token configured</dt>
                  <dd>{readiness?.config?.opsConfigured ? "yes" : "no"}</dd>
                </div>
                <div>
                  <dt>Connect credential (Host)</dt>
                  <dd>
                    {readiness?.config?.connectCredentialConfigured
                      ? "present (lifecycle only)"
                      : "not on this host"}
                  </dd>
                </div>
              </dl>
              <pre className={styles.diagnosticsPayload} tabIndex={0}>
                {JSON.stringify(diagnostics.data ?? diagnostics, null, 2)}
              </pre>
            </>
          ) : null}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.ghost}
              disabled={diagnosticsLoading}
              aria-busy={diagnosticsLoading}
              onClick={() => void loadDiagnostics()}
            >
              {diagnosticsLoading ? "Loading…" : "Refresh diagnostics"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={busy}
              onClick={() => void refreshStatus({ announce: true })}
            >
              Re-check readiness
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
