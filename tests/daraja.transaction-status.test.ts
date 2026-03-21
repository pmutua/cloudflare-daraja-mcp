import { describe, expect, it } from "vitest";
import { normalizeDarajaTransactionStatus } from "../src/daraja";

describe("normalizeDarajaTransactionStatus", () => {
  it("maps successful result code to success", () => {
    const normalized = normalizeDarajaTransactionStatus({
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CheckoutRequestID: "ws_CO_123",
      MerchantRequestID: "123-abc"
    });

    expect(normalized.status).toBe("success");
    expect(normalized.resultCode).toBe(0);
    expect(normalized.checkoutRequestId).toBe("ws_CO_123");
    expect(normalized.message).toContain("successfully");
  });

  it("maps pending response to pending when result code missing", () => {
    const normalized = normalizeDarajaTransactionStatus({
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CheckoutRequestID: "ws_CO_456"
    });

    expect(normalized.status).toBe("pending");
    expect(normalized.resultCode).toBeNull();
    expect(normalized.checkoutRequestId).toBe("ws_CO_456");
  });

  it("maps non-zero result code to failed", () => {
    const normalized = normalizeDarajaTransactionStatus({
      ResultCode: 1032,
      ResultDesc: "Request canceled by user.",
      CheckoutRequestID: "ws_CO_789"
    });

    expect(normalized.status).toBe("failed");
    expect(normalized.resultCode).toBe(1032);
    expect(normalized.message).toContain("canceled");
  });
});
