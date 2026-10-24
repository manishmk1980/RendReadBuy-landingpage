import { NextResponse } from "next/server";
import { ChatOpsError } from "./errors";

export function chatOpsJson<T>(
  body: T,
  init?: { status?: number; requestId?: string },
): NextResponse {
  const response = NextResponse.json(body, {
    status: init?.status ?? 200,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (init?.requestId) {
    response.headers.set("X-Request-ID", init.requestId);
  }
  return response;
}

export function chatOpsErrorResponse(err: unknown): NextResponse {
  if (err instanceof ChatOpsError) {
    const response = chatOpsJson(
      {
        ok: false,
        error: { code: err.code, message: err.message },
      },
      { status: err.status },
    );
    if (err.retryAfterSeconds) {
      response.headers.set("Retry-After", String(err.retryAfterSeconds));
    }
    if (err.status === 401) {
      response.headers.set("WWW-Authenticate", "Session");
    }
    return response;
  }
  return chatOpsJson(
    {
      ok: false,
      error: {
        code: "internal_error",
        message: "The request could not be completed.",
      },
    },
    { status: 500 },
  );
}
