import { describe, expect, it } from "vitest";
import { evaluatePaymentIntent, normalizeDarajaTransactionStatus } from "../src/daraja";

describe("daraja edge cases", () => {
  it("does not throw when callback metadata has malformed phone number", () => {
    const run = () => evaluatePaymentIntent(
      {
        status: "success",
        isComplete: true,
        checkoutRequestId: "ws_CO_edge_1",
        merchantRequestId: "m-edge-1",
        resultCode: 0,
        responseCode: null,
        message: "ok",
        raw: {
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 100 },
              { Name: "PhoneNumber", Value: "INVALID_PHONE" }
            ]
          }
        }
      },
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(run).not.toThrow();

    const result = run();
    expect(result.amountMatch).toBe("match");
    expect(result.phoneMatch).toBe("unknown");
  });

  it("normalizes status safely when payload has no known code fields", () => {
    const normalized = normalizeDarajaTransactionStatus({
      CheckoutRequestID: "ws_CO_edge_2"
    });

    expect(normalized.status).toBe("unknown");
    expect(normalized.isComplete).toBe(false);
    expect(normalized.message).toContain("No status message");
  });

  it("keeps pending state for incomplete transactions even when optional fields are absent", () => {
    const result = evaluatePaymentIntent(
      {
        status: "pending",
        isComplete: false,
        checkoutRequestId: "ws_CO_edge_3",
        merchantRequestId: null,
        resultCode: null,
        responseCode: null,
        message: "still processing",
        raw: {}
      },
      { expectedAmount: 150, expectedPhoneNumber: "254700000001" }
    );

    expect(result.state).toBe("pending");
    expect(result.verified).toBe(false);
    expect(result.phoneMatch).toBe("unknown");
  });
});
