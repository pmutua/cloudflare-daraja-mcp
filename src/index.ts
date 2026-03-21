import { getRegisteredTools, handleMcpRequest, MCP_SERVER_INFO } from "./mcp";
import { checkAndIncrementDailyUsage } from "./rateLimit";
import { handleDarajaCallback } from "./callback";
import { buildErrorLog, buildRequestLog } from "./observability";

export interface Env {
  API_KEY: string;
  USAGE: KVNamespace;
  TOKENS: KVNamespace;
  TRANSACTIONS: KVNamespace;
  CALLBACKS: KVNamespace;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  DEBUG_MODE?: string;
  DARAJA_CONSUMER_KEY?: string;
  DARAJA_CONSUMER_SECRET?: string;
  DARAJA_ENV?: string;
  DARAJA_BASE_URL?: string;
  DARAJA_SHORTCODE?: string;
  DARAJA_PASSKEY?: string;
  DARAJA_CALLBACK_URL?: string;
  DARAJA_TRANSACTION_TYPE?: string;
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

function constantTimeStringEquals(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let i = 0; i < maxLength; i += 1) {
    const leftCode = i < left.length ? left.charCodeAt(i) : 0;
    const rightCode = i < right.length ? right.charCodeAt(i) : 0;
    mismatch |= leftCode ^ rightCode;
  }

  return mismatch === 0;
}

function isAuthorized(request: Request, env: Env): boolean {
  const configuredApiKey = env.API_KEY;
  if (!configuredApiKey) {
    return false;
  }

  const providedApiKey = request.headers.get("x-api-key");
  if (!providedApiKey) {
    return false;
  }

  return constantTimeStringEquals(providedApiKey, configuredApiKey);
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
    const isDebugMode = env.DEBUG_MODE === "true";

    try {
      let response: Response;

      if (request.method === "GET" && url.pathname === "/health") {
        response = json({
          ok: true,
          service: MCP_SERVER_INFO.name,
          status: "healthy",
          timestamp: new Date().toISOString()
        });
      } else if (url.pathname === "/callback") {
        response = await handleDarajaCallback(request, env.CALLBACKS);
      } else if (!isAuthorized(request, env)) {
        response = unauthorized();
      } else {
        const usage = await checkAndIncrementDailyUsage(env.USAGE);
        if (!usage.allowed) {
          response = rateLimited(usage.retryAfterSeconds);
        } else if (url.pathname === "/mcp") {
          response = await handleMcpRequest(request, env);
        } else if (request.method === "GET" && url.pathname === "/mcp/tools") {
          response = json({
            ok: true,
            server: MCP_SERVER_INFO,
            tools: getRegisteredTools()
          });
        } else {
          response = json({
            ok: false,
            error: "not_found",
            message: "Route not found"
          }, 404);
        }
      }

      if (isDebugMode) {
        console.log(JSON.stringify(buildRequestLog(request, response.status, { route: url.pathname })));
      }

      return response;
    } catch (error) {
      if (isDebugMode) {
        console.error(JSON.stringify(buildErrorLog(request, error, { route: url.pathname })));
      }

      return json({
        ok: false,
        error: "internal_error",
        message: "Unexpected server error"
      }, 500);
    }
  }
} satisfies ExportedHandler<Env>;
