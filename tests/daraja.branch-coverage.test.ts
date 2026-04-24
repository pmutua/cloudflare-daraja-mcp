import { describe, expect, it } from "vitest";
import {
  evaluatePaymentIntent,
  explainDarajaErrorCode,
  normalizeDarajaTransactionStatus
} from "../src/daraja";
import type { NormalizedTransactionStatus } from "../src/daraja";

describe("normalizeDarajaTransactionStatus branch coverage", () => {
  it("returns success when ResultCode is 0", () => {
    const result = normalizeDarajaTransactionStatus({
      ResultCode: 0,
      CheckoutRequestID: "ws_CO_1",
      MerchantRequestID: "m-1",
      ResultDesc: "Processed successfully"
    });

    expect(result.status).toBe("success");
    expect(result.isComplete).toBe(true);
    expect(result.message).toBe("Processed successfully");
  });

  it("returns failed when ResultCode is non-zero", () => {
    const result = normalizeDarajaTransactionStatus({
      ResultCode: 1032,
      CheckoutRequestID: "ws_CO_2",
      MerchantRequestID: "m-2"
    });

    expect(result.status).toBe("failed");
    expect(result.isComplete).toBe(true);
  });

  it("returns pending when only ResponseCode is 0 and no ResultCode", () => {
    const result = normalizeDarajaTransactionStatus({
      ResponseCode: 0,
      ResponseDescription: "Accept the request"
    });

    expect(result.status).toBe("pending");
    expect(result.isComplete).toBe(false);
    expect(result.message).toBe("Accept the request");
  });

  it("returns failed when ResponseCode is non-zero and no ResultCode", () => {
    const result = normalizeDarajaTransactionStatus({
      ResponseCode: 1
    });

    expect(result.status).toBe("failed");
    expect(result.isComplete).toBe(false);
  });

  it("uses CustomerMessage when ResultDesc and ResponseDescription are absent", () => {
    const result = normalizeDarajaTransactionStatus({
      ResultCode: 0,
      CustomerMessage: "Success. Request accepted for processing"
    });

    expect(result.message).toBe("Success. Request accepted for processing");
  });

  it("handles null CheckoutRequestID and MerchantRequestID", () => {
    const result = normalizeDarajaTransactionStatus({});

    expect(result.checkoutRequestId).toBeNull();
    expect(result.merchantRequestId).toBeNull();
  });
});

describe("evaluatePaymentIntent additional branches", () => {
  function makeSuccessStatus(raw: Record<string, unknown> = {}): NormalizedTransactionStatus {
    return {
      status: "success",
      isComplete: true,
      checkoutRequestId: "ws_CO_test",
      merchantRequestId: "m-test",
      resultCode: 0,
      responseCode: null,
      message: "ok",
      raw
    };
  }

  it("returns verified with phone unknown when no expectedPhoneNumber given", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({
        CallbackMetadata: {
          Item: [{ Name: "Amount", Value: 100 }]
        }
      }),
      { expectedAmount: 100 }
    );

    expect(result.state).toBe("verified");
    expect(result.phoneMatch).toBe("unknown");
  });

  it("returns unverified when phone mismatch", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 100 },
            { Name: "PhoneNumber", Value: "254700000002" }
          ]
        }
      }),
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.state).toBe("unverified");
    expect(result.phoneMatch).toBe("mismatch");
    expect(result.amountMatch).toBe("match");
  });

  it("handles amount from nested Body.stkCallback.CallbackMetadata path", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({
        Body: {
          stkCallback: {
            CallbackMetadata: {
              Item: [{ Name: "Amount", Value: 500 }]
            }
          }
        }
      }),
      { expectedAmount: 500 }
    );

    expect(result.state).toBe("verified");
    expect(result.amountMatch).toBe("match");
  });

  it("handles direct Amount field when no CallbackMetadata exists", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({ Amount: 200 }),
      { expectedAmount: 200 }
    );

    expect(result.state).toBe("verified");
    expect(result.amountMatch).toBe("match");
  });

  it("returns unknown amount when no amount data at all", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({}),
      { expectedAmount: 100 }
    );

    expect(result.amountMatch).toBe("unknown");
  });

  it("handles direct PhoneNumber field as string", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({ PhoneNumber: "254700000001" }),
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.phoneMatch).toBe("match");
  });

  it("handles direct PhoneNumber field as number", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({ PhoneNumber: 254700000001 }),
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.phoneMatch).toBe("match");
  });

  it("returns phone unknown when expected phone given but actual phone absent", () => {
    const result = evaluatePaymentIntent(
      makeSuccessStatus({}),
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.phoneMatch).toBe("unknown");
  });

  it("failed status returns early with unknown matches", () => {
    const result = evaluatePaymentIntent(
      {
        status: "failed",
        isComplete: true,
        checkoutRequestId: "ws_CO_fail",
        merchantRequestId: "m-fail",
        resultCode: 1032,
        responseCode: null,
        message: "User canceled",
        raw: {}
      },
      { expectedAmount: 100 }
    );

    expect(result.state).toBe("failed");
    expect(result.amountMatch).toBe("unknown");
    expect(result.phoneMatch).toBe("unknown");
  });

  it("pending status with expectedPhoneNumber returns unknown phone", () => {
    const result = evaluatePaymentIntent(
      {
        status: "pending",
        isComplete: false,
        checkoutRequestId: "ws_CO_pend",
        merchantRequestId: null,
        resultCode: null,
        responseCode: null,
        message: "processing",
        raw: {}
      },
      { expectedAmount: 100, expectedPhoneNumber: "254700000001" }
    );

    expect(result.state).toBe("pending");
    expect(result.phoneMatch).toBe("unknown");
  });
});

describe("explainDarajaErrorCode additional branches", () => {
  it("returns mapped explanation for string error code 400.002.02", () => {
    const result = explainDarajaErrorCode("400.002.02");
    expect(result.found).toBe(true);
    expect(result.category).toBe("bad_request");
  });

  it("returns mapped explanation for string error code 404.001.03", () => {
    const result = explainDarajaErrorCode("404.001.03");
    expect(result.found).toBe(true);
    expect(result.category).toBe("invalid_access_token");
  });

  it("returns mapped explanation for string error code 500.003.02", () => {
    const result = explainDarajaErrorCode("500.003.02");
    expect(result.found).toBe(true);
    expect(result.category).toBe("system_busy");
  });

  it("returns invalid_code for non-numeric non-mapped string", () => {
    const result = explainDarajaErrorCode("abc_not_a_code");
    expect(result.found).toBe(false);
    expect(result.category).toBe("invalid_code");
  });

  it("handles empty string code (maps to 0 via Number coercion)", () => {
    const result = explainDarajaErrorCode("");
    // Empty string skips the string branch (length === 0), then Number("") === 0
    expect(result.found).toBe(true);
    expect(result.code).toBe(0);
    expect(result.category).toBe("success");
  });

  it("maps code 0 (success)", () => {
    const result = explainDarajaErrorCode(0);
    expect(result.found).toBe(true);
    expect(result.category).toBe("success");
  });

  it("maps code 1001 (session_conflict)", () => {
    const result = explainDarajaErrorCode(1001);
    expect(result.found).toBe(true);
    expect(result.category).toBe("session_conflict");
  });

  it("maps code 1019 (expired)", () => {
    const result = explainDarajaErrorCode(1019);
    expect(result.found).toBe(true);
    expect(result.category).toBe("expired");
  });

  it("maps code 1025 (request_issue)", () => {
    const result = explainDarajaErrorCode(1025);
    expect(result.found).toBe(true);
    expect(result.category).toBe("request_issue");
  });

  it("maps code 1037 (timeout)", () => {
    const result = explainDarajaErrorCode(1037);
    expect(result.found).toBe(true);
    expect(result.category).toBe("timeout_unreachable");
  });

  it("maps code 2001 (invalid_credentials)", () => {
    const result = explainDarajaErrorCode(2001);
    expect(result.found).toBe(true);
    expect(result.category).toBe("invalid_credentials");
  });

  it("maps code 2 (limit_rule min)", () => {
    const result = explainDarajaErrorCode(2);
    expect(result.found).toBe(true);
    expect(result.category).toBe("limit_rule");
  });

  it("maps code 3 (limit_rule max)", () => {
    const result = explainDarajaErrorCode(3);
    expect(result.found).toBe(true);
    expect(result.category).toBe("limit_rule");
  });

  it("maps code 4 (daily limit)", () => {
    const result = explainDarajaErrorCode(4);
    expect(result.found).toBe(true);
    expect(result.category).toBe("limit_rule");
  });

  it("maps code 8 (balance limit)", () => {
    const result = explainDarajaErrorCode(8);
    expect(result.found).toBe(true);
    expect(result.category).toBe("limit_rule");
  });

  it("maps code 17 (frequency_rule)", () => {
    const result = explainDarajaErrorCode(17);
    expect(result.found).toBe(true);
    expect(result.category).toBe("frequency_rule");
  });

  it("maps code 8006 (credential_locked)", () => {
    const result = explainDarajaErrorCode(8006);
    expect(result.found).toBe(true);
    expect(result.category).toBe("credential_locked");
  });

  it("maps code 9999 (general_error)", () => {
    const result = explainDarajaErrorCode(9999);
    expect(result.found).toBe(true);
    expect(result.category).toBe("general_error");
  });

  it("maps string code 404.001.01", () => {
    const result = explainDarajaErrorCode("404.001.01");
    expect(result.found).toBe(true);
    expect(result.category).toBe("resource_not_found");
  });

  it("maps string code 405.001", () => {
    const result = explainDarajaErrorCode("405.001");
    expect(result.found).toBe(true);
    expect(result.category).toBe("method_not_allowed");
  });

  it("maps string code 500.001.1001", () => {
    const result = explainDarajaErrorCode("500.001.1001");
    expect(result.found).toBe(true);
    expect(result.category).toBe("credential_or_merchant_error");
  });

  it("maps string code 500.003.03", () => {
    const result = explainDarajaErrorCode("500.003.03");
    expect(result.found).toBe(true);
    expect(result.category).toBe("quota_violation");
  });

  it("maps string code 500.003.1001", () => {
    const result = explainDarajaErrorCode("500.003.1001");
    expect(result.found).toBe(true);
    expect(result.category).toBe("internal_server_error");
  });
});
