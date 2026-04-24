import { describe, expect, it } from "vitest";
import { sanitizeSensitive, buildErrorLog } from "../src/observability";

describe("observability branch coverage", () => {
  it("masks nested sensitive fields recursively", () => {
    const result = sanitizeSensitive({
      outer: {
        inner_password: "secret123",
        normal: "visible"
      }
    });

    const outer = result.outer as Record<string, unknown>;
    expect(outer.inner_password).toBe("***masked***");
    expect(outer.normal).toBe("visible");
  });

  it("preserves array values without recursion", () => {
    const result = sanitizeSensitive({
      items: [1, 2, 3],
      normal: "ok"
    });

    expect(result.items).toEqual([1, 2, 3]);
  });

  it("masks apikey field", () => {
    const result = sanitizeSensitive({ apikey: "key123" });
    expect(result.apikey).toBe("***masked***");
  });

  it("masks authorization field", () => {
    const result = sanitizeSensitive({ authorization: "Bearer xyz" });
    expect(result.authorization).toBe("***masked***");
  });

  it("masks passkey field", () => {
    const result = sanitizeSensitive({ passkey: "abc" });
    expect(result.passkey).toBe("***masked***");
  });

  it("buildErrorLog handles non-Error objects", () => {
    const req = new Request("https://example.com/test", { method: "GET" });
    const log = buildErrorLog(req, "string error");

    expect(log.message).toBe("Unknown error");
    expect(log.level).toBe("error");
  });

  it("buildErrorLog handles null error", () => {
    const req = new Request("https://example.com/test", { method: "GET" });
    const log = buildErrorLog(req, null);

    expect(log.message).toBe("Unknown error");
  });
});
