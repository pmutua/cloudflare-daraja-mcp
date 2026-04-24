import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDarajaAccessToken = vi.fn(async () => ({ access_token: "token" }));
const mockStkPush = vi.fn(async (_env: unknown, input: unknown) => ({ ok: true, mapped: input }));
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
    const body = (await request.json()) as { name?: string; args?: Record<string, unknown> };
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

function makeEnv() {
  return {
    TOKENS: {},
    TRANSACTIONS: {},
    AI: undefined
  } as any;
}

function makeRequest(toolName: string, args: Record<string, unknown> = {}) {
  return new Request("https://example.com/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: toolName, args })
  });
}

describe("mcp tool dispatch coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches get_usage_status", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(makeRequest("get_usage_status"), makeEnv());
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { structuredContent: { status: string } };
    expect(payload.structuredContent.status).toBe("ok");
  });

  it("dispatches get_access_token", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(makeRequest("get_access_token"), makeEnv());
    expect(response.status).toBe(200);
    expect(mockGetDarajaAccessToken).toHaveBeenCalledTimes(1);
  });

  it("dispatches check_transaction_status", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("check_transaction_status", { checkoutRequestId: "ws_CO_123" }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockCheckTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it("dispatches verify_payment_intent", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("verify_payment_intent", {
        checkoutRequestId: "ws_CO_123",
        expectedAmount: 100,
        expectedPhoneNumber: "254700000001"
      }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockVerifyPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it("dispatches verify_payment_intent without optional phone", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("verify_payment_intent", {
        checkoutRequestId: "ws_CO_123",
        expectedAmount: 100
      }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockVerifyPaymentIntent).toHaveBeenCalledWith(expect.anything(), {
      checkoutRequestId: "ws_CO_123",
      expectedAmount: 100,
      expectedPhoneNumber: undefined
    });
  });

  it("dispatches simulate_payment with explicit outcome", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("simulate_payment", {
        amount: 50,
        phoneNumber: "254700000001",
        accountReference: "REF1",
        transactionDesc: "Test",
        outcome: "success"
      }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockSimulatePayment).toHaveBeenCalledWith({
      amount: 50,
      phoneNumber: "254700000001",
      accountReference: "REF1",
      transactionDesc: "Test",
      outcome: "success"
    });
  });

  it("dispatches simulate_payment with invalid outcome falls back to undefined", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("simulate_payment", {
        amount: 50,
        phoneNumber: "254700000001",
        accountReference: "REF1",
        transactionDesc: "Test",
        outcome: "invalid_value"
      }),
      makeEnv()
    );
    expect(mockSimulatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: undefined })
    );
  });

  it("dispatches explain_error_code with numeric code", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("explain_error_code", { code: 1032 }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockExplainDarajaErrorCode).toHaveBeenCalledWith(1032);
  });

  it("dispatches explain_error_code with string code", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("explain_error_code", { code: "SFC_IC0003" }),
      makeEnv()
    );
    expect(mockExplainDarajaErrorCode).toHaveBeenCalledWith("SFC_IC0003");
  });

  it("dispatches explain_error_code with invalid code type falls back to empty string", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("explain_error_code", { code: { nested: true } }),
      makeEnv()
    );
    expect(mockExplainDarajaErrorCode).toHaveBeenCalledWith("");
  });

  it("dispatches summarize_transaction_logs with default limit", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("summarize_transaction_logs"),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockSummarizeTransactionLogs).toHaveBeenCalledWith({}, undefined, 20);
  });

  it("dispatches summarize_transaction_logs with custom limit", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("summarize_transaction_logs", { limit: 5 }),
      makeEnv()
    );
    expect(mockSummarizeTransactionLogs).toHaveBeenCalledWith({}, undefined, 5);
  });

  it("dispatches orchestrate_payment_workflow for new_payment", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("orchestrate_payment_workflow", {
        intent: "new_payment",
        amount: 200,
        phoneNumber: "254700000001"
      }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(mockCreatePaymentWorkflowPlan).toHaveBeenCalledWith({
      intent: "new_payment",
      amount: 200,
      phoneNumber: "254700000001",
      checkoutRequestId: undefined
    });
  });

  it("dispatches orchestrate_payment_workflow for check_status", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("orchestrate_payment_workflow", {
        intent: "check_status",
        checkoutRequestId: "ws_CO_999"
      }),
      makeEnv()
    );
    expect(mockCreatePaymentWorkflowPlan).toHaveBeenCalledWith({
      intent: "check_status",
      amount: undefined,
      phoneNumber: undefined,
      checkoutRequestId: "ws_CO_999"
    });
  });

  it("dispatches orchestrate_payment_workflow with invalid intent defaults to new_payment", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("orchestrate_payment_workflow", { intent: "unknown_intent" }),
      makeEnv()
    );
    expect(mockCreatePaymentWorkflowPlan).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "new_payment" })
    );
  });

  it("dispatches stk_push with optional partyB", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("stk_push", {
        amount: 10,
        phoneNumber: "254700000001",
        accountReference: "INV-2",
        partyB: "600000"
      }),
      makeEnv()
    );
    expect(mockStkPush).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ partyB: "600000" })
    );
  });

  it("dispatches stk_push with missing optional fields as undefined", async () => {
    const mcp = await import("../src/mcp");
    await mcp.handleMcpRequest(
      makeRequest("stk_push", {
        amount: 10,
        phoneNumber: "254700000001",
        accountReference: "INV-3"
      }),
      makeEnv()
    );
    expect(mockStkPush).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        transactionDesc: undefined,
        callbackUrl: undefined,
        transactionType: undefined,
        partyB: undefined
      })
    );
  });

  it("returns tool_not_found for unknown tool name", async () => {
    const mcp = await import("../src/mcp");
    const response = await mcp.handleMcpRequest(
      makeRequest("nonexistent_tool"),
      makeEnv()
    );
    expect(response.status).toBe(404);
  });

  it("handles non-Error throw in tool handler", async () => {
    const mcp = await import("../src/mcp");
    mcp.registerTool("string_throw", "throws a string", async () => {
      throw "raw string error";
    });

    const response = await mcp.handleMcpRequest(makeRequest("string_throw"), makeEnv());
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      isError: boolean;
      structuredContent: { message: string };
    };
    expect(payload.isError).toBe(true);
    expect(payload.structuredContent.message).toBe("Unexpected tool execution error");
  });
});
