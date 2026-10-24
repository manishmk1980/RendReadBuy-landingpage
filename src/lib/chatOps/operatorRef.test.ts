// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildSilverOperatorRef,
  CONSOLE_INSTANCE_ID_PATTERN,
  OPERATOR_REF_MAX,
  parseConsoleInstanceId,
} from "./operatorRef";

const session = {
  sub: "silver-ops",
  sid: "session-id-alpha",
};

describe("buildSilverOperatorRef", () => {
  it("derives a stable opaque ref per session + console instance", () => {
    const a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const refA = buildSilverOperatorRef(session, a);
    const refA2 = buildSilverOperatorRef(session, a);
    const refB = buildSilverOperatorRef(session, b);
    expect(refA).toBe(refA2);
    expect(refA).not.toBe(refB);
    expect(refA.startsWith("sil:")).toBe(true);
    expect(refA.length).toBeLessThanOrEqual(OPERATOR_REF_MAX);
    expect(refA).not.toContain(session.sub);
    expect(refA).not.toContain(session.sid);
  });

  it("rejects invalid console instance ids", () => {
    expect(() => buildSilverOperatorRef(session, "short")).toThrow(
      /invalid_console_instance_id/,
    );
    expect(() => buildSilverOperatorRef(session, "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")).toThrow(
      /invalid_console_instance_id/,
    );
  });

  it("changes when the session sid changes (multi-operator / re-login)", () => {
    const id = "cccccccccccccccccccccccccccccccc";
    const other = buildSilverOperatorRef({ sub: "silver-ops", sid: "other-sid" }, id);
    expect(other).not.toBe(buildSilverOperatorRef(session, id));
  });
});

describe("parseConsoleInstanceId", () => {
  it("accepts 32-char hex only", () => {
    expect(parseConsoleInstanceId("dddddddddddddddddddddddddddddddd")).toBe(
      "dddddddddddddddddddddddddddddddd",
    );
    expect(parseConsoleInstanceId("DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD")).toBe(
      "dddddddddddddddddddddddddddddddd",
    );
    expect(parseConsoleInstanceId("not-hex")).toBeNull();
    expect(parseConsoleInstanceId(null)).toBeNull();
    expect(CONSOLE_INSTANCE_ID_PATTERN.test("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")).toBe(
      true,
    );
  });
});
