import { getRegisteredTools, handleMcpRequest, MCP_SERVER_INFO } from "./mcp";
import { checkAndIncrementDailyUsage } from "./rateLimit";

export interface Env {
  API_KEY: string;
  USAGE: KVNamespace;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const configuredApiKey = env.API_KEY;
  if (!configuredApiKey) {
    return false;
  }

  const providedApiKey = request.headers.get("x-api-key");
  return providedApiKey === configuredApiKey;
}

function unauthorized(): Response {
  return json({
    ok: false,
    error: "unauthorized",
    message: "Missing or invalid API key"
  }, 401);
}

function rateLimited(remainingSeconds: number): Response {
  return json({
    ok: false,
    error: "rate_limited",
    message: "Daily request limit reached",
    limitPerDay: 50,
    retryAfterSeconds: remainingSeconds
  }, 429);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        service: MCP_SERVER_INFO.name,
        status: "healthy",
        timestamp: new Date().toISOString()
      });
    }

    if (!isAuthorized(request, env)) {
      return unauthorized();
    }

    const usage = await checkAndIncrementDailyUsage(env.USAGE);
    if (!usage.allowed) {
      return rateLimited(usage.retryAfterSeconds);
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
