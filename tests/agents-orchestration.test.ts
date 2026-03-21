import { describe, expect, it } from "vitest";
import { createPaymentWorkflowPlan } from "../src/agents";

describe("createPaymentWorkflowPlan", () => {
  it("creates a complete workflow for new payment", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "new_payment",
      amount: 100,
      phoneNumber: "254700000001"
    });

    expect(plan.workflow).toBe("payment_orchestration");
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.steps[0].tool).toBe("stk_push");
    expect(plan.steps.some((s) => s.tool === "verify_payment_intent")).toBe(true);
  });

  it("creates a status-check workflow", () => {
    const plan = createPaymentWorkflowPlan({
      intent: "check_status",
      checkoutRequestId: "ws_CO_123"
    });

    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].tool).toBe("check_transaction_status");
  });
});
