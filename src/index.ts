import { getRegisteredTools, handleMcpRequest, MCP_SERVER_INFO } from "./mcp";

export interface Env {}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: MCP_SERVER_INFO.name,
        status: "healthy",
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/mcp") {
      return handleMcpRequest(request);
    }

    if (request.method === "GET" && url.pathname === "/mcp/tools") {
      return json({
        ok: true,
        server: MCP_SERVER_INFO,
        tools: getRegisteredTools()
      });
    }

    return json({
      ok: false,
      error: "not_found",
      message: "Route not found"
    }, 404);
  }
} satisfies ExportedHandler<Env>;
