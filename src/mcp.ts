import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  checkTransactionStatus,
  explainDarajaErrorCode,
  getDarajaAccessToken,
  simulatePayment,
  stkPush,
  verifyPaymentIntent
} from "./daraja";
import { summarizeTransactionLogs } from "./insights";
import { createPaymentWorkflowPlan } from "./agents";

export const MCP_SERVER_INFO = {
  name: "daraja-mcp-server",
  version: "1.0.0"
} as const;

type ToolRuntimeEnv = {
  TOKENS: KVNamespace;
  TRANSACTIONS: KVNamespace;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  DARAJA_CONSUMER_KEY?: string;
  DARAJA_CONSUMER_SECRET?: string;
  DARAJA_ENV?: string;
  DARAJA_BASE_URL?: string;
  DARAJA_SHORTCODE?: string;
  DARAJA_PASSKEY?: string;
  DARAJA_CALLBACK_URL?: string;
  DARAJA_TRANSACTION_TYPE?: string;
};

type ToolContext = {
  env: ToolRuntimeEnv;
};

type ToolHandler = (
  context: ToolContext,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>> | Record<string, unknown>;

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema?: z.ZodRawShape;
  handler: ToolHandler;
};

type RegisteredTool = {
  name: string;
  description: string;
};

const registeredTools = new Map<string, ToolDefinition>();

export function registerTool(
  name: string,
  description: string,
  handler: ToolHandler,
  inputSchema?: z.ZodRawShape
): void {
  registeredTools.set(name, { name, description, handler, inputSchema });
}

export function getRegisteredTools(): RegisteredTool[] {
  return Array.from(registeredTools.values()).map(({ name, description }) => ({ name, description }));
}

function createMcpServer(env: ToolRuntimeEnv): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    capabilities: {
      tools: {}
    }
  });

  for (const tool of registeredTools.values()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema
      },
      async (args) => {
        try {
          const normalizedArgs = (args ?? {}) as Record<string, unknown>;
          const result = await tool.handler({ env }, normalizedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ],
            structuredContent: result
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected tool execution error";
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: message
              }
            ],
            structuredContent: {
              ok: false,
              error: "tool_execution_failed",
              message
            }
          };
        }
      }
    );
  }

  return server;
}

export async function handleMcpRequest(request: Request, env: ToolRuntimeEnv): Promise<Response> {
  const server = createMcpServer(env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

registerTool(
  "get_usage_status",
  "Returns current API usage and daily limit information.",
  async () => {
    return {
      limitPerDay: 50,
      usedToday: 0,
      remainingToday: 50,
      status: "ok"
    };
  }
);

registerTool(
  "get_access_token",
  "Generates and returns a Daraja OAuth access token (cached in TOKENS KV).",
  async ({ env }) => getDarajaAccessToken(env)
);

registerTool(
  "stk_push",
  "Initiates an M-Pesa STK Push request and logs transaction metadata to KV.",
  async ({ env }, args) => {
    return stkPush(env, {
      amount: Number(args.amount),
      phoneNumber: String(args.phoneNumber ?? ""),
      accountReference: String(args.accountReference ?? ""),
      transactionDesc: String(args.transactionDesc ?? ""),
      callbackUrl: typeof args.callbackUrl === "string" ? args.callbackUrl : undefined,
      transactionType: typeof args.transactionType === "string" ? args.transactionType : undefined
    });
  },
  {
    amount: z.number().positive().describe("Amount to charge, positive whole number."),
    phoneNumber: z.string().describe("Customer phone number in 2547XXXXXXXX or 07XXXXXXXX format."),
    accountReference: z.string().min(1).max(12).describe("Reference shown to customer, max 12 chars."),
    transactionDesc: z.string().min(1).max(13).describe("Short transaction description, max 13 chars."),
    callbackUrl: z.string().url().optional().describe("Optional callback URL override."),
    transactionType: z
      .enum(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"])
      .optional()
      .describe("Daraja STK transaction type.")
  }
);

registerTool(
  "check_transaction_status",
  "Queries Daraja for STK transaction status and returns a normalized response.",
  async ({ env }, args) => {
    return checkTransactionStatus(env, {
      checkoutRequestId: String(args.checkoutRequestId ?? "")
    });
  },
  {
    checkoutRequestId: z.string().min(1).describe("CheckoutRequestID returned from stk_push.")
  }
);

registerTool(
  "verify_payment_intent",
  "Verifies payment intent using transaction status, amount matching, and optional phone matching.",
  async ({ env }, args) => {
    return verifyPaymentIntent(env, {
      checkoutRequestId: String(args.checkoutRequestId ?? ""),
      expectedAmount: Number(args.expectedAmount),
      expectedPhoneNumber: typeof args.expectedPhoneNumber === "string" ? args.expectedPhoneNumber : undefined
    });
  },
  {
    checkoutRequestId: z.string().min(1).describe("CheckoutRequestID from stk_push response."),
    expectedAmount: z.number().positive().describe("Expected payment amount for this intent."),
    expectedPhoneNumber: z
      .string()
      .optional()
      .describe("Optional expected customer phone for additional verification.")
  }
);

registerTool(
  "simulate_payment",
  "Simulates a payment flow for development without calling Daraja APIs.",
  async (_, args) => {
    return simulatePayment({
      amount: Number(args.amount),
      phoneNumber: String(args.phoneNumber ?? ""),
      accountReference: String(args.accountReference ?? ""),
      transactionDesc: String(args.transactionDesc ?? ""),
      outcome: args.outcome === "success" || args.outcome === "failed" || args.outcome === "pending"
        ? args.outcome
        : undefined
    });
  },
  {
    amount: z.number().positive().describe("Amount to simulate."),
    phoneNumber: z.string().describe("Customer phone number in 2547XXXXXXXX or 07XXXXXXXX format."),
    accountReference: z.string().min(1).max(12).describe("Reference shown to customer, max 12 chars."),
    transactionDesc: z.string().min(1).max(13).describe("Transaction description, max 13 chars."),
    outcome: z.enum(["pending", "success", "failed"]).optional().describe("Optional forced simulation outcome.")
  }
);

registerTool(
  "explain_error_code",
  "Explains known Daraja error codes and recommended next actions.",
  async (_, args) => {
    return explainDarajaErrorCode(typeof args.code === "string" || typeof args.code === "number" ? args.code : "");
  },
  {
    code: z.union([z.number(), z.string()]).describe("Daraja result/error code to explain.")
  }
);

registerTool(
  "summarize_transaction_logs",
  "Summarizes recent transaction logs and optionally enhances the summary using Workers AI.",
  async ({ env }, args) => {
    const limit = typeof args.limit === "number" ? args.limit : 20;
    return summarizeTransactionLogs(env.TRANSACTIONS, env.AI, limit);
  },
  {
    limit: z.number().int().positive().max(100).optional().describe("Max number of recent transaction logs to summarize.")
  }
);

registerTool(
  "orchestrate_payment_workflow",
  "Creates a multi-agent payment workflow plan for orchestration.",
  async (_, args) => {
    const intent = args.intent === "check_status" ? "check_status" : "new_payment";
    return createPaymentWorkflowPlan({
      intent,
      amount: typeof args.amount === "number" ? args.amount : undefined,
      phoneNumber: typeof args.phoneNumber === "string" ? args.phoneNumber : undefined,
      checkoutRequestId: typeof args.checkoutRequestId === "string" ? args.checkoutRequestId : undefined
    });
  },
  {
    intent: z.enum(["new_payment", "check_status"]).describe("Workflow intent for orchestration."),
    amount: z.number().positive().optional().describe("Expected amount for new payment orchestration."),
    phoneNumber: z.string().optional().describe("Optional phone for new payment orchestration."),
    checkoutRequestId: z.string().optional().describe("Required when intent is check_status.")
  }
);
