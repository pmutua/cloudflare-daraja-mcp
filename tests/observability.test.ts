import { describe, expect, it } from "vitest";
import { buildRequestLog, buildErrorLog, sanitizeSensitive } from "../src/observability";

describe("sanitizeSensitive", () => {
  it("masks known sensitive fields", () => {
    const result = sanitizeSensitive({
      Password: "secret",
      token: "abc",
      normal: "ok"
    });

    expect(result.Password).toBe("***masked***");
    expect(result.token).toBe("***masked***");
    expect(result.normal).toBe("ok");
  });
});

describe("buildRequestLog", () => {
  it("creates structured request log entry", () => {
    const req = new Request("https://example.com/mcp", { method: "POST" });
    const log = buildRequestLog(req, 200, { route: "/mcp" });

    expect(log.method).toBe("POST");
    expect(log.path).toBe("/mcp");
    expect(log.status).toBe(200);
    expect(log.context.route).toBe("/mcp");
  });
});

describe("buildErrorLog", () => {
  it("creates structured error entry", () => {
    const req = new Request("https://example.com/mcp", { method: "POST" });
    const log = buildErrorLog(req, new Error("boom"));

    expect(log.level).toBe("error");
    expect(log.message).toContain("boom");
    expect(log.path).toBe("/mcp");
  });
});
