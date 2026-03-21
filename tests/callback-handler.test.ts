import { describe, expect, it } from "vitest";
import { handleDarajaCallback } from "../src/callback";

class InMemoryKv {
  public writes: Array<{ key: string; value: string; options?: { expirationTtl?: number } }> = [];

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.writes.push({ key, value, options });
  }
}

describe("handleDarajaCallback", () => {
  it("stores callback payload in KV and returns ack", async () => {
    const kv = new InMemoryKv();
    const payload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "12345",
          CheckoutRequestID: "ws_CO_123",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully."
        }
      }
    };

    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; stored: boolean; checkoutRequestId: string };
    expect(body.ok).toBe(true);
    expect(body.stored).toBe(true);
    expect(body.checkoutRequestId).toBe("ws_CO_123");
    expect(kv.writes.length).toBe(1);
    expect(kv.writes[0].key).toContain("ws_CO_123");
  });

  it("rejects non-POST requests", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", { method: "GET" }),
      kv
    );

    expect(response.status).toBe(405);
  });

  it("returns 400 for invalid JSON", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json"
      }),
      kv
    );

    expect(response.status).toBe(400);
    expect(kv.writes.length).toBe(0);
  });
});
