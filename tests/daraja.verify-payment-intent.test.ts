import { describe, expect, it } from "vitest";
import { evaluatePaymentIntent } from "../src/daraja";

describe("evaluatePaymentIntent", () => {
  it("returns pending when transaction is not complete", () => {
    const result = evaluatePaymentIntent(
      {
        status: "pending",
        isComplete: false,
        checkoutRequestId: "ws_CO_pending",
        merchantRequestId: "m-1",
        resultCode: null,
        responseCode: 0,
        message: "Request accepted for processing",
        raw: {}
      },
      { expectedAmount: 100 }
    );

    expect(result.state).toBe("pending");
    expect(result.verified).toBe(false);
    expect(result.amountMatch).toBe("unknown");
  });

  it("returns verified when successful and amount matches", () => {
    const result = evaluatePaymentIntent(
      {
        status: "success",
        isComplete: true,
        checkoutRequestId: "ws_CO_ok",
        merchantRequestId: "m-2",
        resultCode: 0,
        responseCode: null,
        message: "The service request is processed successfully.",
        raw: {
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 100 },
              { Name: "PhoneNumber", Value: 254700000001 }
            ]
          }
        }
      },
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.state).toBe("verified");
    expect(result.verified).toBe(true);
    expect(result.amountMatch).toBe("match");
    expect(result.phoneMatch).toBe("match");
  });

  it("returns unverified when successful but amount mismatches", () => {
    const result = evaluatePaymentIntent(
      {
        status: "success",
        isComplete: true,
        checkoutRequestId: "ws_CO_bad_amount",
        merchantRequestId: "m-3",
        resultCode: 0,
        responseCode: null,
        message: "The service request is processed successfully.",
        raw: {
          CallbackMetadata: {
            Item: [{ Name: "Amount", Value: 200 }]
          }
        }
      },
      { expectedAmount: 100 }
    );

    expect(result.state).toBe("unverified");
    expect(result.verified).toBe(false);
    expect(result.amountMatch).toBe("mismatch");
  });

  it("returns failed when transaction failed", () => {
    const result = evaluatePaymentIntent(
      {
        status: "failed",
        isComplete: true,
        checkoutRequestId: "ws_CO_failed",
        merchantRequestId: "m-4",
        resultCode: 1032,
        responseCode: null,
        message: "Request canceled by user.",
        raw: {}
      },
      { expectedAmount: 100 }
    );

    expect(result.state).toBe("failed");
    expect(result.verified).toBe(false);
  });
});
