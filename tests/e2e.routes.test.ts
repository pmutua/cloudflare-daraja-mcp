import { describe, expect, it } from "vitest";
import worker from "../src/index";

class InMemoryKv {
  private store = new Map<string, string>();

  async get<T = string>(key: string, type?: "text" | "json"): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) {
      return null;
    }

    if (type === "json") {
      return JSON.parse(raw) as T;
    }

    return raw as T;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async list(): Promise<{ keys: Array<{ name: string }> }> {
    return { keys: Array.from(this.store.keys()).map((name) => ({ name })) };
  }
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeEnv(overrides: Record<string, unknown> = {}) {
  const env = {
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

  return env;
}

describe("Worker routes end-to-end", () => {
  it("GET /health is public and healthy", async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request("https://example.com/health"), env as any);

    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("daraja-mcp-server");
  });

  it("POST /callback does not require API key and stores payload", async () => {
    const callbacks = new InMemoryKv();
    const env = makeEnv({ CALLBACKS: callbacks });

    const response = await worker.fetch(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Body: { stkCallback: { CheckoutRequestID: "ws_CO_E2E" } } })
      }),
      env as any
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { stored: boolean; checkoutRequestId: string };
    expect(body.stored).toBe(true);
    expect(body.checkoutRequestId).toBe("ws_CO_E2E");

    const listed = await callbacks.list();
    expect(listed.keys.some((k) => k.name.includes("ws_CO_E2E"))).toBe(true);
  });

  it("protected routes require x-api-key", async () => {
    const env = makeEnv();

    const response = await worker.fetch(new Request("https://example.com/mcp/tools"), env as any);
    expect(response.status).toBe(401);
  });

  it("GET /mcp/tools works with API key", async () => {
    const env = makeEnv();

    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "test-key" }
      }),
      env as any
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; tools: Array<{ name: string }> };
    expect(body.ok).toBe(true);
    expect(body.tools.some((tool) => tool.name === "stk_push")).toBe(true);
  });

  it("returns 429 when daily limit is exhausted", async () => {
    const usage = new InMemoryKv();
    await usage.put(`usage:${dayKey()}`, JSON.stringify({ count: 50, date: dayKey() }));
    const env = makeEnv({ USAGE: usage });

    const response = await worker.fetch(
      new Request("https://example.com/mcp/tools", {
        headers: { "x-api-key": "test-key" }
      }),
      env as any
    );

    expect(response.status).toBe(429);
    const body = await response.json() as { error: string };
    expect(body.error).toBe("rate_limited");
  });
});
