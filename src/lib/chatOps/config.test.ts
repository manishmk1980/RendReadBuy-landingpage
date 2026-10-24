// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  getChatOpsConfigStatus,
  isValidConnectCredential,
  isValidIntegrationApiBaseUrl,
  isValidOpsToken,
  readChatOpsConfig,
} from "./config";

const VALID_TOKEN = "a".repeat(32);
const VALID_CONNECT =
  "cck_0123456789abcdef0123456789abcdef.ccs_AbCdEfGhIjKlMnOpQrStUvWx";

describe("chatOps config", () => {
  it("accepts https API bases without credentials or query", () => {
    expect(isValidIntegrationApiBaseUrl("https://uk.primewayz.com")).toBe(true);
    expect(isValidIntegrationApiBaseUrl("http://uk.primewayz.com")).toBe(false);
    expect(
      isValidIntegrationApiBaseUrl("https://user:pass@uk.primewayz.com"),
    ).toBe(false);
    expect(isValidIntegrationApiBaseUrl("https://uk.primewayz.com?x=1")).toBe(
      false,
    );
  });

  it("validates ops token length and charset", () => {
    expect(isValidOpsToken(VALID_TOKEN)).toBe(true);
    expect(isValidOpsToken("short")).toBe(false);
  });

  it("validates Chat Connect credential shape without requiring it for ops", () => {
    expect(isValidConnectCredential(VALID_CONNECT)).toBe(true);
    expect(isValidConnectCredential("not-a-connect-token")).toBe(false);
  });

  it("requires ops token and API base independently of connect credential", () => {
    const withOpsOnly = getChatOpsConfigStatus({
      CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
      RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
    });
    expect(withOpsOnly.configured).toBe(true);
    expect(withOpsOnly.connectCredentialConfigured).toBe(false);

    const withConnectOnly = getChatOpsConfigStatus({
      CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
      RRB_SILVER_CHAT_CONNECT_CREDENTIAL: VALID_CONNECT,
    });
    expect(withConnectOnly.configured).toBe(false);
    expect(withConnectOnly.connectCredentialConfigured).toBe(true);

    const both = getChatOpsConfigStatus({
      CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com",
      RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
      RRB_SILVER_CHAT_CONNECT_CREDENTIAL: VALID_CONNECT,
    });
    expect(both.configured).toBe(true);
    expect(both.connectCredentialConfigured).toBe(true);
  });

  it("readChatOpsConfig fails closed and never returns secrets in errors", () => {
    expect(readChatOpsConfig({})).toBeNull();
    const config = readChatOpsConfig({
      CHAT_INTEGRATION_API_BASE_URL: "https://uk.primewayz.com/",
      RRB_SILVER_CHAT_INTEGRATION_TOKEN: VALID_TOKEN,
    });
    expect(config).toEqual({
      apiBaseUrl: "https://uk.primewayz.com",
      opsToken: VALID_TOKEN,
    });
  });
});
