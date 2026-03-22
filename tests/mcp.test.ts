import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDarajaAccessToken = vi.fn(async () => ({ access_token: "token" }));
const mockStkPush = vi.fn(async (_env, input) => ({ ok: true, mapped: input }));
const mockCheckTransactionStatus = vi.fn(async () => ({ status: "pending" }));
const mockVerifyPaymentIntent = vi.fn(async () => ({ verified: true }));
const mockSimulatePayment = vi.fn(async () => ({ simulated: true }));
const mockExplainDarajaErrorCode = vi.fn(() => ({ found: true, code: 0 }));
const mockSummarizeTransactionLogs = vi.fn(async () => ({ ok: true, source: "deterministic" }));
const mockCreatePaymentWorkflowPlan = vi.fn(() => ({ workflow: "payment_orchestration" }));

vi.mock("../src/daraja", () => ({
  getDarajaAccessToken: mockGetDarajaAccessToken,
  stkPush: mockStkPush,
  checkTransactionStatus: mockCheckTransactionStatus,
  verifyPaymentIntent: mockVerifyPaymentIntent,
  simulatePayment: mockSimulatePayment,
  explainDarajaErrorCode: mockExplainDarajaErrorCode
}));

vi.mock("../src/insights", () => ({
  summarizeTransactionLogs: mockSummarizeTransactionLogs
}));

vi.mock("../src/agents", () => ({
  createPaymentWorkflowPlan: mockCreatePaymentWorkflowPlan
}));

class MockMcpServer {
  private tools = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  constructor(_info: unknown, _options: unknown) {}

  registerTool(
    name: string,
    _meta: unknown,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.tools.set(name, handler);
  }

  async connect(transport: MockTransport): Promise<void> {
    transport.bindTools(this.tools);
  }
}

class MockTransport {
  private tools = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  constructor(_options: unknown) {}

  bindTools(tools: Map<string, (args: Record<string, unknown>) => Promise<unknown>>): void {
    this.tools = tools;
  }

  async handleRequest(request: Request): Promise<Response> {
    const body = await request.json() as { name?: string; args?: Record<string, unknown> };
    const name = body.name ?? "";
    const handler = this.tools.get(name);

    if (!handler) {
      return new Response(JSON.stringify({ ok: false, error: "tool_not_found" }), { status: 404 });
    }

    const result = await handler(body.args ?? {});
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
}

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: MockMcpServer
}));

vi.mock("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js", () => ({
  WebStandardStreamableHTTPServerTransport: MockTransport
}));

describe("mcp module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes built-in tool metadata", async () => {
    const mcp = await import("../src/mcp");
    const tools = mcp.getRegisteredTools();

    expect(tools.some((tool) => tool.name === "stk_push")).toBe(true);
    expect(tools.some((tool) => tool.name === "check_transaction_status")).toBe(true);
  });

  it("routes tool calls through handleMcpRequest and maps stk_push inputs", async () => {
    const mcp = await import("../src/mcp");

    const env = {
      TOKENS: {},
      TRANSACTIONS: {}
    } as any;

    const request = new Request("https://example.com/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "stk_push",
        args: {
          amount: "2",
          phoneNumber: "254722000000",
          accountReference: "INV-1",
          transactionDesc: "Pay",
          callbackUrl: "https://example.com/callback",
          transactionType: "CustomerPayBillOnline"
        }
      })
    });

    const response = await mcp.handleMcpRequest(request, env);
    expect(response.status).toBe(200);

    const payload = await response.json() as {
      structuredContent: { ok: boolean; mapped: { amount: number } };
    };

    expect(payload.structuredContent.ok).toBe(true);
    expect(payload.structuredContent.mapped.amount).toBe(2);
    expect(mockStkPush).toHaveBeenCalledTimes(1);
  });

  it("returns tool_execution_failed when handler throws", async () => {
    const mcp = await import("../src/mcp");
    const boom = vi.fn(async () => {
      throw new Error("boom");
    });

    mcp.registerTool("boom_tool", "throws", boom as any);

    const request = new Request("https://example.com/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "boom_tool", args: {} })
    });

    const response = await mcp.handleMcpRequest(request, { TOKENS: {}, TRANSACTIONS: {} } as any);
    expect(response.status).toBe(200);

    const payload = await response.json() as {
      isError: boolean;
      structuredContent: { error: string; message: string };
    };

    expect(payload.isError).toBe(true);
    expect(payload.structuredContent.error).toBe("tool_execution_failed");
    expect(payload.structuredContent.message).toContain("boom");
  });
});
