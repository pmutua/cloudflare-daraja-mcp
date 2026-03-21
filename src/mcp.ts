import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export const MCP_SERVER_INFO = {
  name: "daraja-mcp-server",
  version: "1.0.0"
} as const;

type ToolHandler = () => Promise<Record<string, unknown>> | Record<string, unknown>;

type RegisteredTool = {
  name: string;
  description: string;
};

const registeredTools = new Map<string, RegisteredTool>();

const mcpServer = new McpServer(MCP_SERVER_INFO, {
  capabilities: {
    tools: {}
  }
});

let transport: WebStandardStreamableHTTPServerTransport | undefined;

export function registerTool(name: string, description: string, handler: ToolHandler): void {
  registeredTools.set(name, { name, description });

  mcpServer.registerTool(
    name,
    {
      description
    },
    async () => {
      const result = await handler();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ],
        structuredContent: result
      };
    }
  );
}

export function getRegisteredTools(): RegisteredTool[] {
  return Array.from(registeredTools.values());
}

async function ensureTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
  if (!transport) {
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await mcpServer.connect(transport);
  }

  return transport;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const activeTransport = await ensureTransport();
  return activeTransport.handleRequest(request);
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
