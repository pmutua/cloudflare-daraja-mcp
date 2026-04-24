import { describe, expect, it } from "vitest";
import { createPaymentWorkflowPlan } from "../src/agents";

describe("createPaymentWorkflowPlan branch coverage", () => {
  it("defaults amount to 0 when not provided for new_payment", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "new_payment"
    });

    expect(plan.workflow).toBe("payment_orchestration");
    expect(plan.intent).toBe("new_payment");
    expect(plan.steps[0].input.amount).toBe(0);
    expect(plan.steps[0].input.phoneNumber).toBe("");
  });

  it("defaults checkoutRequestId to empty string when not provided for check_status", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "check_status"
    });

    expect(plan.intent).toBe("check_status");
    expect(plan.steps[0].input.checkoutRequestId).toBe("");
  });

  it("propagates phoneNumber into verify step for new_payment", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "new_payment",
      amount: 250,
      phoneNumber: "254700000001"
    });

    const verifyStep = plan.steps.find((s) => s.tool === "verify_payment_intent");
    expect(verifyStep).toBeDefined();
    expect(verifyStep!.input.expectedPhoneNumber).toBe("254700000001");
    expect(verifyStep!.input.expectedAmount).toBe(250);
  });

  it("defaults phoneNumber to empty in verify step when not provided", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "new_payment",
      amount: 300
    });

    const verifyStep = plan.steps.find((s) => s.tool === "verify_payment_intent");
    expect(verifyStep!.input.expectedPhoneNumber).toBe("");
  });
});
