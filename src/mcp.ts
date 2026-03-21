import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getDarajaAccessToken } from "./daraja";

export const MCP_SERVER_INFO = {
  name: "daraja-mcp-server",
  version: "1.0.0"
} as const;

type ToolRuntimeEnv = {
  TOKENS: KVNamespace;
  DARAJA_CONSUMER_KEY?: string;
  DARAJA_CONSUMER_SECRET?: string;
  DARAJA_ENV?: string;
  DARAJA_BASE_URL?: string;
};

type ToolContext = {
  env: ToolRuntimeEnv;
};

type ToolHandler = (context: ToolContext) => Promise<Record<string, unknown>> | Record<string, unknown>;

type ToolDefinition = {
  name: string;
  description: string;
  handler: ToolHandler;
};

type RegisteredTool = {
  name: string;
  description: string;
};

const registeredTools = new Map<string, ToolDefinition>();

export function registerTool(name: string, description: string, handler: ToolHandler): void {
  registeredTools.set(name, { name, description, handler });
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
        description: tool.description
      },
      async () => {
        try {
          const result = await tool.handler({ env });
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
