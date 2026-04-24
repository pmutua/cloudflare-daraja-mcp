import { describe, expect, it } from "vitest";
import { handleDarajaCallback } from "../src/callback";

class InMemoryKv {
  public writes: Array<{ key: string; value: string; options?: { expirationTtl?: number } }> = [];

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.writes.push({ key, value, options });
  }
}

describe("callback branch coverage", () => {
  it("handles payload with direct CheckoutRequestID (non-nested)", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ CheckoutRequestID: "ws_CO_DIRECT" })
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutRequestId: string };
    expect(body.checkoutRequestId).toBe("ws_CO_DIRECT");
  });

  it("generates UUID when no CheckoutRequestID in any shape", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ someOtherField: "value" })
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutRequestId: string };
    // UUID format check
    expect(body.checkoutRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(kv.writes.length).toBe(1);
  });

  it("handles nested Body without stkCallback", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Body: { otherData: "value" } })
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutRequestId: string };
    // Should fall through to UUID generation
    expect(body.checkoutRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("handles nested stkCallback without CheckoutRequestID", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          Body: { stkCallback: { ResultCode: 0 } }
        })
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutRequestId: string };
    expect(body.checkoutRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("handles empty string CheckoutRequestID falls through to UUID", async () => {
    const kv = new InMemoryKv();
    const response = await handleDarajaCallback(
      new Request("https://example.com/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ CheckoutRequestID: "   " })
      }),
      kv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutRequestId: string };
    expect(body.checkoutRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
