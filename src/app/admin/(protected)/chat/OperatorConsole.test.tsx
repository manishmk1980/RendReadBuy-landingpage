// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperatorConsole } from "./OperatorConsole";

type FetchArgs = Parameters<typeof fetch>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockApis(overrides?: {
  readiness?: unknown;
  dashboard?: unknown;
  conversation?: unknown;
  diagnostics?: unknown;
  heartbeatStatus?: number;
  offlineStatus?: number;
  heartbeatBody?: unknown;
  offlineBody?: unknown;
}) {
  const readiness = overrides?.readiness ?? {
    ok: true,
    conversationOps: "ready",
    ready: true,
    productionReady: false,
    config: { opsConfigured: true, connectCredentialConfigured: false },
  };
  const dashboard = overrides?.dashboard ?? {
    ok: true,
    data: {
      recentConversations: [
        {
          sessionId: "sess-1",
          status: "open",
          visitorLabel: "Jordan",
          intent: "silver-membership",
          originatingPage: "https://join.rentreadbuy.com/join",
          visitorPresence: "active",
          lastMessagePreview: "Can I join?",
          needsAttention: true,
          lastActivityAt: new Date().toISOString(),
        },
      ],
    },
  };
  const conversation = overrides?.conversation ?? {
    ok: true,
    data: {
      sessionId: "sess-1",
      status: "open",
      visitorLabel: "Jordan",
      intent: "silver-membership",
      originatingPage: "https://join.rentreadbuy.com/join",
      visitorPresence: "active",
      messages: [
        { id: "m1", role: "visitor", text: "Can I join?" },
        { id: "m2", actor: "operator", text: "Happy to help." },
      ],
    },
  };
  const diagnostics = overrides?.diagnostics ?? {
    ok: true,
    requestId: "req-diag",
    tenant: { key: "rrb-silver-campaign" },
    generatedAt: new Date().toISOString(),
    productionReady: false,
    data: { authentication: { valid: true, scopes: ["chat:dashboard"] } },
  };

  const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
    const url = String(args[0]);
    const init = args[1] as RequestInit | undefined;
    if (url.includes("/api/admin/chat/readiness")) {
      return jsonResponse(readiness);
    }
    if (url.includes("/api/admin/chat/dashboard")) {
      return jsonResponse(dashboard);
    }
    if (url.includes("/api/admin/chat/conversation")) {
      return jsonResponse(conversation);
    }
    if (url.includes("/api/admin/chat/diagnostics")) {
      return jsonResponse(diagnostics);
    }
    if (url.includes("/api/admin/chat/presence/heartbeat")) {
      return jsonResponse(
        overrides?.heartbeatBody ?? {
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        },
        overrides?.heartbeatStatus ?? 200,
      );
    }
    if (url.includes("/api/admin/chat/presence/offline")) {
      return jsonResponse(
        overrides?.offlineBody ?? { ok: true, cleared: 1 },
        overrides?.offlineStatus ?? 200,
      );
    }
    if (url.includes("/api/admin/chat/reply") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    if (url.includes("/api/admin/chat/resolve") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    if (url.includes("/api/admin/chat/reopen") && init?.method === "POST") {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: { message: `unexpected ${url}` } }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OperatorConsole WS-5 IA", () => {
  beforeEach(() => {
    document.cookie = "rrb_silver_chat_admin_csrf=test-csrf; path=/";
    window.sessionStorage.clear();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("exposes four navigation surfaces with keyboard-accessible tabs", async () => {
    mockApis();
    render(<OperatorConsole />);

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"),
      ).toBe("true");
    });

    for (const name of [
      "Overview",
      "Conversations",
      "Operator Availability",
      "Diagnostics",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    expect(
      screen.getByRole("tab", { name: "Conversations" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("heading", { name: "Conversations" })).toBeTruthy();
  });

  it("loads Central conversation fields in the inbox and detail pane", async () => {
    const fetchMock = mockApis();
    render(<OperatorConsole />);

    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));

    await waitFor(() => {
      expect(screen.getByText(/Jordan/)).toBeTruthy();
    });
    expect(screen.getByText(/silver-membership/)).toBeTruthy();
    expect(screen.getByText(/needs attention/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Jordan/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Can I join?").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("Happy to help.")).toBeTruthy();
    });

    const dashboardCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/admin/chat/dashboard"),
    );
    expect(dashboardCalls.some((call) => String(call[0]).includes("inbox=active"))).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Archived (read)" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("inbox=archived"),
        ),
      ).toBe(true);
    });
  });

  it("keeps Offline until heartbeat succeeds, then uses one state-aware control", async () => {
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return jsonResponse(
            { error: { message: "presence scope missing" } },
            403,
          );
        }
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));

    const goOnline = await screen.findByRole("button", { name: /go online/i });
    fireEvent.click(goOnline);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/presence scope/i);
    });
    expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /go online/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();
    });
    const statuses = screen.getAllByRole("status");
    expect(
      statuses.some((node) => /online/i.test(node.textContent ?? "")),
    ).toBe(true);
  });

  it("releases presence busy after HTTP 401 on Go Online so retry can succeed", async () => {
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return jsonResponse(
            { error: { message: "Authentication required." } },
            401,
          );
        }
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));

    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/session expired/i);
    });
    const retryButton = screen.getByRole("button", { name: /go online/i });
    expect(retryButton).toBeTruthy();
    expect(retryButton.getAttribute("aria-busy")).not.toBe("true");
    expect((retryButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /updating/i })).toBeNull();

    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();
    });
    expect(heartbeatCalls).toBe(2);
  });

  it("does not confirm Online when heartbeat returns non-JSON HTTP 200", async () => {
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        return new Response("<html>gateway</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/unreadable|heartbeat failed|network/i);
    });
    expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();
  });

  it("does not treat non-JSON HTTP 200 reply as a successful mutation", async () => {
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      const init = args[1] as RequestInit | undefined;
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({
          ok: true,
          data: {
            recentConversations: [
              {
                sessionId: "sess-1",
                status: "open",
                visitorLabel: "Jordan",
                intent: "silver-membership",
                needsAttention: true,
                lastActivityAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (url.includes("/conversation")) {
        return jsonResponse({
          ok: true,
          data: {
            sessionId: "sess-1",
            status: "open",
            visitorLabel: "Jordan",
            messages: [{ id: "m1", role: "visitor", text: "Can I join?" }],
          },
        });
      }
      if (url.includes("/reply") && init?.method === "POST") {
        return new Response("thanks", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    await waitFor(() => {
      expect(screen.getByText(/Jordan/)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /Jordan/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/reply/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/reply/i), {
      target: { value: "Hello from ops" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/unreadable|reply failed/i);
    });
    expect(screen.queryByText(/reply sent/i)).toBeNull();
  });

  it("does not flip to Offline until the offline API succeeds", async () => {
    let offlineCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        offlineCalls += 1;
        if (offlineCalls === 1) {
          return jsonResponse({ error: { message: "offline failed" } }, 503);
        }
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/offline failed/i);
    });
    expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    });
  });

  it("wires diagnostics and recovers from readiness failures", async () => {
    let readinessFails = true;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        if (readinessFails) {
          return jsonResponse(
            { error: { message: "Central unreachable" } },
            503,
          );
        }
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true, connectCredentialConfigured: false },
        });
      }
      if (url.includes("/diagnostics")) {
        return jsonResponse({
          ok: true,
          requestId: "req-1",
          tenant: { key: "rrb-silver-campaign" },
          data: { ok: true },
          productionReady: false,
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/unreachable/i);
    });

    readinessFails = false;
    fireEvent.click(screen.getByRole("button", { name: /retry readiness/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/readiness confirmed/i);
    });

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    await waitFor(() => {
      expect(screen.getByText("rrb-silver-campaign")).toBeTruthy();
      expect(screen.getByText(/req-1/)).toBeTruthy();
    });
  });

  it("supports reply resolve reopen workflow with success status", async () => {
    mockApis();
    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    await waitFor(() => screen.getByText(/Jordan/));
    fireEvent.click(screen.getByRole("button", { name: /Jordan/i }));
    await screen.findByLabelText(/reply/i);

    fireEvent.change(screen.getByLabelText(/reply/i), {
      target: { value: "Welcome to Silver." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/reply sent/i);
    });

    fireEvent.click(screen.getByRole("button", { name: /^resolve$/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/resolved/i);
    });

    fireEvent.click(screen.getByRole("button", { name: /^reopen$/i }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toMatch(/reopened/i);
    });
  });

  it("stacks navigation for narrow viewports via responsive CSS class hooks", () => {
    mockApis({
      readiness: {
        ok: true,
        conversationOps: "not_configured",
        ready: false,
        config: { opsConfigured: false },
      },
    });
    const { container } = render(<OperatorConsole />);
    expect(container.querySelector(`.${"tabList"}`) || container.querySelector('[role="tablist"]')).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: /chat administration/i });
    expect(within(nav).getAllByRole("tab")).toHaveLength(4);
  });

  it("does not auto-retry diagnostics after HTTP failure; retry is manual only", async () => {
    let diagnosticsCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/diagnostics")) {
        diagnosticsCalls += 1;
        return jsonResponse(
          { error: { message: "Diagnostics boom" } },
          503,
        );
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/diagnostics boom/i);
    });
    expect(diagnosticsCalls).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(diagnosticsCalls).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /^retry$/i }));
    await waitFor(() => {
      expect(diagnosticsCalls).toBe(2);
    });
  });

  it("marks Offline when a renewal heartbeat fails after confirmed Online", async () => {
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return jsonResponse({
            ok: true,
            contributing: true,
            expiresInMs: 300_000,
            presencePolicy: "legacy",
          });
        }
        return jsonResponse(
          { error: { message: "heartbeat renewal expired" } },
          401,
        );
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toMatch(/session expired/i);
    });
  });

  it("ignores overlapping presence toggles while a transition is in flight", async () => {
    let releaseHeartbeat!: (value: Response) => void;
    const heartbeatGate = new Promise<Response>((resolve) => {
      releaseHeartbeat = resolve;
    });
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return heartbeatGate;
        }
        return jsonResponse({
          ok: true,
          contributing: true,
          expiresInMs: 300_000,
          presencePolicy: "legacy",
        });
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    const goOnline = await screen.findByRole("button", { name: /go online/i });
    fireEvent.click(goOnline);
    fireEvent.click(goOnline);
    fireEvent.click(goOnline);

    await waitFor(() => {
      expect(heartbeatCalls).toBe(1);
    });

    releaseHeartbeat(
      jsonResponse({
        ok: true,
        contributing: true,
        expiresInMs: 300_000,
        presencePolicy: "legacy",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();
    });
    expect(heartbeatCalls).toBe(1);
  });

  it("ignores stale conversation payloads after selecting another thread", async () => {
    let releaseFirst!: (value: Response) => void;
    const firstGate = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    let conversationCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({
          ok: true,
          data: {
            recentConversations: [
              {
                sessionId: "sess-1",
                status: "open",
                visitorLabel: "Alpha",
                lastMessagePreview: "First",
                needsAttention: false,
              },
              {
                sessionId: "sess-2",
                status: "open",
                visitorLabel: "Beta",
                lastMessagePreview: "Second",
                needsAttention: false,
              },
            ],
          },
        });
      }
      if (url.includes("/conversation")) {
        conversationCalls += 1;
        if (url.includes("sess-1") && conversationCalls === 1) {
          return firstGate;
        }
        if (url.includes("sess-2")) {
          return jsonResponse({
            ok: true,
            data: {
              sessionId: "sess-2",
              status: "open",
              visitorLabel: "Beta",
              messages: [{ id: "b1", role: "visitor", text: "Beta transcript" }],
            },
          });
        }
        return jsonResponse({
          ok: true,
          data: {
            sessionId: "sess-1",
            status: "open",
            visitorLabel: "Alpha",
            messages: [{ id: "a1", role: "visitor", text: "Alpha stale" }],
          },
        });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    await waitFor(() => screen.getByText(/Alpha/));

    fireEvent.click(screen.getByRole("button", { name: /Alpha/i }));
    fireEvent.click(screen.getByRole("button", { name: /Beta/i }));

    await waitFor(() => {
      expect(screen.getByText("Beta transcript")).toBeTruthy();
    });

    releaseFirst(
      jsonResponse({
        ok: true,
        data: {
          sessionId: "sess-1",
          status: "open",
          visitorLabel: "Alpha",
          messages: [{ id: "a1", role: "visitor", text: "Alpha stale" }],
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByText("Alpha stale")).toBeNull();
    expect(screen.getByText("Beta transcript")).toBeTruthy();
  });

  it("ignores stale inbox payloads after changing the filter", async () => {
    let releaseActive!: (value: Response) => void;
    const activeGate = new Promise<Response>((resolve) => {
      releaseActive = resolve;
    });
    let dashboardCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        dashboardCalls += 1;
        if (url.includes("inbox=active") && dashboardCalls === 1) {
          return activeGate;
        }
        if (url.includes("inbox=archived")) {
          return jsonResponse({
            ok: true,
            data: {
              recentConversations: [
                {
                  sessionId: "arch-1",
                  status: "archived",
                  visitorLabel: "Archived Visitor",
                  lastMessagePreview: "Old thread",
                },
              ],
            },
          });
        }
        return jsonResponse({
          ok: true,
          data: {
            recentConversations: [
              {
                sessionId: "act-1",
                status: "open",
                visitorLabel: "Active Visitor",
                lastMessagePreview: "Fresh",
              },
            ],
          },
        });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    await waitFor(() => expect(dashboardCalls).toBeGreaterThanOrEqual(1));

    fireEvent.click(screen.getByRole("tab", { name: "Archived (read)" }));
    await waitFor(() => {
      expect(screen.getByText(/Archived Visitor/)).toBeTruthy();
    });

    releaseActive(
      jsonResponse({
        ok: true,
        data: {
          recentConversations: [
            {
              sessionId: "act-stale",
              status: "open",
              visitorLabel: "Stale Active",
              lastMessagePreview: "Should not appear",
            },
          ],
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByText("Stale Active")).toBeNull();
    expect(screen.getByText(/Archived Visitor/)).toBeTruthy();
  });

  it("surfaces network failures for readiness without crashing", async () => {
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        throw new TypeError("Failed to fetch");
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/network error/i);
    });
    expect(screen.getByRole("button", { name: /retry readiness/i })).toBeTruthy();
  });

  it("supports arrow and home/end keys for primary navigation and inbox filters", async () => {
    mockApis();
    render(<OperatorConsole />);

    const overview = await screen.findByRole("tab", { name: "Overview" });
    overview.focus();
    const primaryList = overview.closest('[role="tablist"]');
    expect(primaryList).toBeTruthy();

    fireEvent.keyDown(primaryList!, { key: "ArrowRight" });
    expect(
      screen.getByRole("tab", { name: "Conversations" }).getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.keyDown(
      screen.getByRole("tab", { name: "Conversations" }).closest('[role="tablist"]')!,
      { key: "End" },
    );
    expect(
      screen.getByRole("tab", { name: "Diagnostics" }).getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.keyDown(
      screen.getByRole("tab", { name: "Diagnostics" }).closest('[role="tablist"]')!,
      { key: "Home" },
    );
    expect(
      screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Conversations" }));
    const activeInbox = await screen.findByRole("tab", { name: "Active" });
    expect(activeInbox.getAttribute("tabIndex")).toBe("0");
    expect(
      screen.getByRole("tab", { name: "Archived (read)" }).getAttribute("tabIndex"),
    ).toBe("-1");

    const inboxList = screen.getByRole("tablist", { name: /inbox filter/i });
    fireEvent.keyDown(inboxList, { key: "ArrowRight" });
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Archived (read)" }).getAttribute("aria-selected"),
      ).toBe("true");
    });
    expect(screen.getByRole("tab", { name: "Active" }).getAttribute("tabIndex")).toBe(
      "-1",
    );
  });

  it("does not withdraw presence on pagehide or unmount after going Online", async () => {
    const fetchMock = mockApis({
      heartbeatBody: {
        ok: true,
        contributing: true,
        expiresInMs: 300_000,
        presencePolicy: "legacy_forced_online",
      },
    });
    const { unmount } = render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });

    window.dispatchEvent(new Event("pagehide"));
    unmount();

    const offlineCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/presence/offline"),
    );
    expect(offlineCalls).toHaveLength(0);
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "online",
    );
  });

  it("restores Online after remount when session intent remains and heartbeat confirms", async () => {
    const fetchMock = mockApis({
      heartbeatBody: {
        ok: true,
        contributing: true,
        expiresInMs: 300_000,
        presencePolicy: "legacy_forced_online",
      },
    });
    const first = render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });
    first.unmount();

    const heartbeatBeforeRestore = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/presence/heartbeat"),
    ).length;

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go offline/i })).toBeTruthy();
    });
    expect(
      screen.getAllByRole("status").some((node) => /restored online/i.test(node.textContent ?? "")),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/presence/heartbeat"),
      ).length,
    ).toBeGreaterThan(heartbeatBeforeRestore);
    expect(
      fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes("/presence/offline"),
      ),
    ).toHaveLength(0);
  });

  it("stays Offline after remount when prior Online intent is absent", async () => {
    mockApis();
    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    await screen.findByRole("button", { name: /go online/i });
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();
  });

  it("clears Online intent on explicit Go Offline", async () => {
    mockApis();
    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBe(
      "online",
    );

    fireEvent.click(screen.getByRole("button", { name: /go offline/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    });
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
  });

  it("does not restore Online when a post-refresh heartbeat is rejected", async () => {
    window.sessionStorage.setItem("rrb_silver_chat_presence_intent", "online");
    let heartbeatCalls = 0;
    const fetchMock = vi.fn(async (...args: FetchArgs): Promise<Response> => {
      const url = String(args[0]);
      if (url.includes("/readiness")) {
        return jsonResponse({
          ok: true,
          conversationOps: "ready",
          ready: true,
          config: { opsConfigured: true },
        });
      }
      if (url.includes("/dashboard")) {
        return jsonResponse({ ok: true, data: { recentConversations: [] } });
      }
      if (url.includes("/presence/heartbeat")) {
        heartbeatCalls += 1;
        return jsonResponse(
          { error: { message: "presence expired" } },
          403,
        );
      }
      if (url.includes("/presence/offline")) {
        return jsonResponse({ ok: true, cleared: 1 });
      }
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));

    await waitFor(() => {
      expect(heartbeatCalls).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /go online/i })).toBeTruthy();
    });
    expect(window.sessionStorage.getItem("rrb_silver_chat_presence_intent")).toBeNull();
    expect(screen.queryByRole("button", { name: /go offline/i })).toBeNull();
  });

  it("keeps separate console instance ids so tabs do not share operator refs", async () => {
    mockApis();
    window.sessionStorage.setItem(
      "rrb_silver_chat_console_instance",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    render(<OperatorConsole />);
    fireEvent.click(screen.getByRole("tab", { name: "Operator Availability" }));
    fireEvent.click(await screen.findByRole("button", { name: /go online/i }));
    await screen.findByRole("button", { name: /go offline/i });

    const firstInstance = window.sessionStorage.getItem(
      "rrb_silver_chat_console_instance",
    );
    expect(firstInstance).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    // Simulate another tab with its own sessionStorage-backed instance id.
    window.sessionStorage.setItem(
      "rrb_silver_chat_console_instance",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(window.sessionStorage.getItem("rrb_silver_chat_console_instance")).not.toBe(
      firstInstance,
    );
  });
});
