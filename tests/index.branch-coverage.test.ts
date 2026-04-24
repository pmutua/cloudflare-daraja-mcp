import { describe, expect, it, vi } from "vitest";
import worker from "../src/index";

class InMemoryKv {
  private store = new Map<string, string>();

  async get<T = string>(key: string, type?: "text" | "json"): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (type === "json") return JSON.parse(raw) as T;
    return raw as T;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async list(): Promise<{ keys: Array<{ name: string }> }> {
    return { keys: Array.from(this.store.keys()).map((name) => ({ name })) };
  }
}

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    API_KEY: "test-key",
    USAGE: new InMemoryKv(),
    TOKENS: new InMemoryKv(),
    TRANSACTIONS: new InMemoryKv(),
    CALLBACKS: new InMemoryKv(),
    DARAJA_CONSUMER_KEY: "x",
    DARAJA_CONSUMER_SECRET: "y",
    DARAJA_SHORTCODE: "174379",
    DARAJA_PASSKEY: "passkey",
    DARAJA_CALLBACK_URL: "https://example.com/callback",
    DEBUG_MODE: "false",
    ...overrides
  };
}

describe("index.ts branch coverage", () => {
  it("returns 404 for unknown authenticated route", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://example.com/unknown-route", {
        headers: { "x-api-key": "test-key" }
      }),
      env as any
    );
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("returns 503 when CALLBACKS binding is missing for /callback", async () => {
    const env = makeEnv({ CALLBACKS: undefined });
    const response = await worker.fetch(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Body: {} })
      }),
      env as any
    );
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: string; message: string };
    expect(body.error).toBe("configuration_error");
    expect(body.message).toContain("CALLBACKS");
  });

  it("returns 401 when API_KEY is not configured", async () => {
    const env = makeEnv({ API_KEY: "" });
    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "anything" }
      }),
      env as any
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when no x-api-key header provided", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools"),
      env as any
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when x-api-key does not match", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "wrong-key" }
      }),
      env as any
    );
    expect(response.status).toBe(401);
  });

  it("logs request when DEBUG_MODE is true", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const env = makeEnv({ DEBUG_MODE: "true" });

    const response = await worker.fetch(
      new Request("https://example.com/health"),
      env as any
    );

    expect(response.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalled();
    const logArg = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(logArg);
    expect(parsed.event).toBe("request");
    expect(parsed.path).toBe("/health");
    consoleSpy.mockRestore();
  });

  it("logs error when DEBUG_MODE is true and handler throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create env where USAGE.get throws to simulate internal error on an authenticated route
    const brokenUsage = {
      async get() {
        throw new Error("KV exploded");
      },
      async put() {},
      async list() {
        return { keys: [] };
      }
    };

    const env = makeEnv({ DEBUG_MODE: "true", USAGE: brokenUsage });

    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "test-key" }
      }),
      env as any
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("internal_error");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("returns 500 for internal errors without DEBUG_MODE", async () => {
    const brokenUsage = {
      async get() {
        throw new Error("KV exploded");
      },
      async put() {},
      async list() {
        return { keys: [] };
      }
    };

    const env = makeEnv({ USAGE: brokenUsage });

    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "test-key" }
      }),
      env as any
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("internal_error");
  });

  it("constant time comparison handles different length keys", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "x" }
      }),
      env as any
    );
    expect(response.status).toBe(401);
  });
});
