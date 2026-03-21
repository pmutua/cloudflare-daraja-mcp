type JsonLike = Record<string, unknown>;

const SENSITIVE_KEYS = ["password", "token", "secret", "apikey", "api_key", "authorization", "passkey"];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

export function sanitizeSensitive(input: JsonLike): JsonLike {
  const output: JsonLike = {};

  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      output[key] = "***masked***";
      continue;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      output[key] = sanitizeSensitive(value as JsonLike);
      continue;
    }

    output[key] = value;
  }

  return output;
}

export function buildRequestLog(request: Request, status: number, context: JsonLike = {}): JsonLike {
  const url = new URL(request.url);
  return {
    level: "info",
    event: "request",
    method: request.method,
    path: url.pathname,
    status,
    timestamp: new Date().toISOString(),
    context: sanitizeSensitive(context)
  };
}

export function buildErrorLog(request: Request, error: unknown, context: JsonLike = {}): JsonLike {
  const url = new URL(request.url);
  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    level: "error",
    event: "request_error",
    method: request.method,
    path: url.pathname,
    message,
    timestamp: new Date().toISOString(),
    context: sanitizeSensitive(context)
  };
}
