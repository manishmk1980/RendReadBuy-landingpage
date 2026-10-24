import type { SilverChatOpsAction } from "./constants";

export type CentralTenantView = {
  key: string;
  market?: string;
  displayName?: string;
};

export type CentralOpsSuccessEnvelope<T = unknown> = {
  ok: true;
  apiVersion: string;
  requestId: string;
  tenant: CentralTenantView;
  generatedAt: string;
  data: T;
};

export type CentralOpsErrorEnvelope = {
  ok: false;
  apiVersion?: string;
  requestId?: string;
  error?: { code?: string; message?: string };
};

export type OpsActor = {
  externalUserId: string;
  displayName?: string | null;
};

export type DashboardRequest = {
  action: "dashboard";
  inbox?: "active" | "archived";
};

export type ConversationRequest = {
  action: "conversation";
  sessionId: string;
};

export type DiagnosticsRequest = {
  action: "diagnostics";
};

export type ReplyRequest = {
  action: "reply";
  sessionId: string;
  clientActionId: string;
  actor: OpsActor;
  text: string;
};

export type ResolveRequest = {
  action: "resolve";
  sessionId: string;
  clientActionId: string;
  actor: OpsActor;
};

export type ReopenRequest = {
  action: "reopen";
  sessionId: string;
  clientActionId: string;
  actor: OpsActor;
};

export type SilverOpsRequest =
  | DashboardRequest
  | ConversationRequest
  | DiagnosticsRequest
  | ReplyRequest
  | ResolveRequest
  | ReopenRequest;

export type SilverOpsRequestAction = SilverOpsRequest["action"];

export function isSilverOpsAction(value: string): value is SilverChatOpsAction {
  return (
    value === "dashboard" ||
    value === "conversation" ||
    value === "diagnostics" ||
    value === "reply" ||
    value === "resolve" ||
    value === "reopen"
  );
}
