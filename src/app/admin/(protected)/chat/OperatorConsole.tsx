"use client";

import { useCallback, useState } from "react";
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from "@/lib/adminAuth/constants";
import styles from "../../admin.module.css";

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

type DashboardConversation = {
  sessionId?: string;
  status?: string;
  visitorReference?: string;
  lastMessagePreview?: string;
  updatedAt?: string;
};

type DashboardData = {
  recentConversations?: DashboardConversation[];
  service?: { status?: string; chatEnabled?: boolean };
};

type TranscriptMessage = {
  id?: string;
  role?: string;
  text?: string;
  createdAt?: string;
};

type ConversationData = {
  sessionId?: string;
  status?: string;
  messages?: TranscriptMessage[];
};

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${ADMIN_CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(ADMIN_CSRF_COOKIE.length + 1));
}

async function adminGet<T>(path: string): Promise<{ status: number; body: T }> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = (await response.json()) as T;
  return { status: response.status, body };
}

async function adminMutate<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: T }> {
  const csrfToken = readCsrfCookie();
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(csrfToken ? { [ADMIN_CSRF_HEADER]: csrfToken } : {}),
    },
    body: JSON.stringify({ ...payload, csrfToken }),
  });
  const body = (await response.json()) as T;
  return { status: response.status, body };
}

export function OperatorConsole() {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  const loadDashboard = useCallback(async () => {
    const { status, body } = await adminGet<{
      ok?: boolean;
      data?: DashboardData;
      error?: { message?: string };
    }>("/api/admin/chat/dashboard");
    if (status >= 400) {
      setError(body.error?.message ?? "Dashboard unavailable.");
      setDashboard(null);
      return;
    }
    setDashboard(body.data ?? null);
    setError(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { status, body } = await adminGet<ReadinessResponse>(
        "/api/admin/chat/readiness",
      );
      if (status === 401) {
        setError("Session expired. Sign in again.");
        setReadiness(null);
        return;
      }
      setReadiness(body);
      if (body.ready) {
        await loadDashboard();
      } else {
        setDashboard(null);
        setConversation(null);
        setSelectedId(null);
      }
    } finally {
      setBusy(false);
      setStarted(true);
    }
  }, [loadDashboard]);

  const loadConversation = useCallback(async (sessionId: string) => {
    const { status, body } = await adminGet<{
      ok?: boolean;
      data?: ConversationData;
      error?: { message?: string };
    }>(`/api/admin/chat/conversation?sessionId=${encodeURIComponent(sessionId)}`);
    if (status >= 400) {
      setError(body.error?.message ?? "Conversation unavailable.");
      setConversation(null);
      return;
    }
    setConversation(body.data ?? null);
    setError(null);
  }, []);

  async function onSelect(sessionId: string) {
    setSelectedId(sessionId);
    setReplyText("");
    await loadConversation(sessionId);
  }

  async function onReply() {
    if (!selectedId || !replyText.trim()) return;
    setBusy(true);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/reply", {
        sessionId: selectedId,
        text: replyText.trim(),
      });
      if (status >= 400) {
        setError(body.error?.message ?? "Reply failed.");
        return;
      }
      setReplyText("");
      await loadConversation(selectedId);
      await loadDashboard();
    } finally {
      setBusy(false);
    }
  }

  async function onResolve() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/resolve", { sessionId: selectedId });
      if (status >= 400) {
        setError(body.error?.message ?? "Resolve failed.");
        return;
      }
      await loadConversation(selectedId);
      await loadDashboard();
    } finally {
      setBusy(false);
    }
  }

  async function onReopen() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { status, body } = await adminMutate<{
        error?: { message?: string };
      }>("/api/admin/chat/reopen", { sessionId: selectedId });
      if (status >= 400) {
        setError(body.error?.message ?? "Reopen failed.");
        return;
      }
      await loadConversation(selectedId);
      await loadDashboard();
    } finally {
      setBusy(false);
    }
  }

  const status = readiness?.conversationOps ?? "not_configured";

  return (
    <div className={styles.console}>
      <section className={styles.panel} aria-labelledby="ops-status-title">
        <h2 id="ops-status-title" className={styles.sectionTitle}>
          Connection status
        </h2>
        <p className={styles.lede}>
          Operational readiness requires a live, tenant-validated response from
          the central chat platform. Local login alone is not enough.
        </p>
        {started ? (
          <dl className={styles.statusGrid}>
            <div>
              <dt>Conversation ops</dt>
              <dd>{status}</dd>
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
            <div>
              <dt>Production ready</dt>
              <dd>no — admin-auth hardening pending</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.lede}>
            Check readiness to probe the central platform for this tenant.
          </p>
        )}
        {readiness?.detail ? (
          <p className={styles.note}>{readiness.detail}</p>
        ) : null}
        <button
          type="button"
          className={styles.ghost}
          disabled={busy}
          onClick={() => void refreshStatus()}
        >
          {busy ? "Checking…" : started ? "Re-check readiness" : "Check readiness"}
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {status === "ready" ? (
        <section className={styles.panel} aria-labelledby="inbox-title">
          <h2 id="inbox-title" className={styles.sectionTitle}>
            Conversations
          </h2>
          <div className={styles.inboxLayout}>
            <ul className={styles.conversationList}>
              {(dashboard?.recentConversations ?? []).map((item) => {
                const id = item.sessionId ?? "";
                if (!id) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={
                        selectedId === id
                          ? styles.conversationActive
                          : styles.conversationItem
                      }
                      onClick={() => void onSelect(id)}
                    >
                      <span className={styles.conversationMeta}>
                        {item.status ?? "open"} · {item.visitorReference ?? id.slice(0, 8)}
                      </span>
                      <span className={styles.conversationPreview}>
                        {item.lastMessagePreview ?? "No preview"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {(dashboard?.recentConversations ?? []).length === 0 ? (
                <li className={styles.lede}>No recent conversations.</li>
              ) : null}
            </ul>

            <div className={styles.conversationDetail}>
              {conversation ? (
                <>
                  <p className={styles.conversationMeta}>
                    Status: {conversation.status ?? "unknown"}
                  </p>
                  <ol className={styles.transcript}>
                    {(conversation.messages ?? []).map((message, index) => (
                      <li key={message.id ?? `${index}`}>
                        <strong>{message.role ?? "message"}</strong>
                        <p>{message.text ?? ""}</p>
                      </li>
                    ))}
                  </ol>
                  <div className={styles.replyBox}>
                    <label className={styles.label} htmlFor="reply-text">
                      Reply
                      <textarea
                        id="reply-text"
                        className={styles.textarea}
                        rows={3}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.submit}
                        disabled={busy || !replyText.trim()}
                        onClick={() => void onReply()}
                      >
                        Send reply
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
                </>
              ) : (
                <p className={styles.lede}>Select a conversation to view the transcript.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
