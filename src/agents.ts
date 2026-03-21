export type WorkflowIntent = "new_payment" | "check_status";

export type PaymentWorkflowInput = {
  intent: WorkflowIntent;
  amount?: number;
  phoneNumber?: string;
  checkoutRequestId?: string;
};

type WorkflowStep = {
  agent: string;
  tool: string;
  purpose: string;
  input: Record<string, unknown>;
};

export type PaymentWorkflowPlan = {
  workflow: "payment_orchestration";
  intent: WorkflowIntent;
  steps: WorkflowStep[];
};

export function createPaymentWorkflowPlan(input: PaymentWorkflowInput): PaymentWorkflowPlan {
  if (input.intent === "check_status") {
    return {
      workflow: "payment_orchestration",
      intent: "check_status",
      steps: [
        {
          agent: "status-agent",
          tool: "check_transaction_status",
          purpose: "Query transaction completion state",
          input: {
            checkoutRequestId: input.checkoutRequestId ?? ""
          }
        }
      ]
    };
  }

  return {
    workflow: "payment_orchestration",
    intent: "new_payment",
    steps: [
      {
        agent: "payment-init-agent",
        tool: "stk_push",
        purpose: "Initiate customer STK push",
        input: {
          amount: input.amount ?? 0,
          phoneNumber: input.phoneNumber ?? ""
        }
      },
      {
        agent: "status-agent",
        tool: "check_transaction_status",
        purpose: "Poll payment status",
        input: {
          checkoutRequestId: "<from stk_push>"
        }
      },
      {
        agent: "verification-agent",
        tool: "verify_payment_intent",
        purpose: "Validate amount and optional customer identity",
        input: {
          checkoutRequestId: "<from status>",
          expectedAmount: input.amount ?? 0,
          expectedPhoneNumber: input.phoneNumber ?? ""
        }
      }
    ]
  };
}
