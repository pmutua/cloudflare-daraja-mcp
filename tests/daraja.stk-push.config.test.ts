import { describe, expect, it, vi } from "vitest";
import { stkPush } from "../src/daraja";

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
}

describe("stkPush configuration edge cases", () => {
  it("allows PartyB override for buy goods flows", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/oauth/v1/generate")) {
        return new Response(JSON.stringify({ access_token: "token", expires_in: 3599 }), { status: 200 });
      }

      const body = JSON.parse(String(init?.body));
      expect(body.TransactionType).toBe("CustomerBuyGoodsOnline");
      expect(body.PartyB).toBe("600123");

      return new Response(JSON.stringify({ ResponseCode: "0", CheckoutRequestID: "ws_CO_1" }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const env = {
      TOKENS: new InMemoryKv() as any,
      TRANSACTIONS: new InMemoryKv() as any,
      DARAJA_CONSUMER_KEY: "key",
      DARAJA_CONSUMER_SECRET: "secret",
      DARAJA_SHORTCODE: "174379",
      DARAJA_PASSKEY: "passkey",
      DARAJA_CALLBACK_URL: "https://example.com/callback"
    };

    await stkPush(env, {
      amount: 1,
      phoneNumber: "254722000000",
      accountReference: "INV-1",
      transactionDesc: "Pay",
      transactionType: "CustomerBuyGoodsOnline",
      partyB: "600123"
    } as any);

    vi.unstubAllGlobals();
  });

  it("uses safe default transaction description when omitted", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/oauth/v1/generate")) {
        return new Response(JSON.stringify({ access_token: "token", expires_in: 3599 }), { status: 200 });
      }

      const body = JSON.parse(String(init?.body));
      expect(body.TransactionDesc).toBe("Payment");

      return new Response(JSON.stringify({ ResponseCode: "0", CheckoutRequestID: "ws_CO_2" }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const env = {
      TOKENS: new InMemoryKv() as any,
      TRANSACTIONS: new InMemoryKv() as any,
      DARAJA_CONSUMER_KEY: "key",
      DARAJA_CONSUMER_SECRET: "secret",
      DARAJA_SHORTCODE: "174379",
      DARAJA_PASSKEY: "passkey",
      DARAJA_CALLBACK_URL: "https://example.com/callback"
    };

    await stkPush(env, {
      amount: 1,
      phoneNumber: "254722000000",
      accountReference: "INV-2"
    } as any);

    vi.unstubAllGlobals();
  });
});
