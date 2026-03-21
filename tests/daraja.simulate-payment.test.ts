import { describe, expect, it } from "vitest";
import { simulatePayment } from "../src/daraja";

describe("simulatePayment", () => {
  it("returns simulated pending status for valid input", async () => {
    const result = await simulatePayment({
      amount: 100,
      phoneNumber: "0700000001",
      accountReference: "INV-001",
      transactionDesc: "Order"
    });

    expect(result.simulated).toBe(true);
    expect(result.status).toBe("pending");
    expect(typeof result.checkoutRequestId).toBe("string");
    expect(result.phoneNumber).toBe("254700000001");
  });

  it("supports forced success simulation", async () => {
    const result = await simulatePayment({
      amount: 100,
      phoneNumber: "254700000001",
      accountReference: "INV-002",
      transactionDesc: "Order",
      outcome: "success"
    });

    expect(result.status).toBe("success");
    expect(result.resultCode).toBe(0);
    expect(result.verifiedHint).toContain("verify_payment_intent");
  });

  it("supports forced failure simulation", async () => {
    const result = await simulatePayment({
      amount: 100,
      phoneNumber: "254700000001",
      accountReference: "INV-003",
      transactionDesc: "Order",
      outcome: "failed"
    });

    expect(result.status).toBe("failed");
    expect(result.resultCode).not.toBe(0);
  });
});
