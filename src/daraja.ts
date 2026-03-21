const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";
const TOKEN_CACHE_KEY = "daraja:oauth:access_token";
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

type CachedToken = {
  accessToken: string;
  expiresAt: number;
  fetchedAt: string;
  baseUrl: string;
};

export type DarajaEnv = {
  TOKENS: KVNamespace;
  DARAJA_CONSUMER_KEY?: string;
  DARAJA_CONSUMER_SECRET?: string;
  DARAJA_ENV?: string;
  DARAJA_BASE_URL?: string;
};

function resolveDarajaBaseUrl(env: DarajaEnv): string {
  if (env.DARAJA_BASE_URL && env.DARAJA_BASE_URL.trim().length > 0) {
    return env.DARAJA_BASE_URL.trim().replace(/\/$/, "");
  }

  if (env.DARAJA_ENV?.toLowerCase() === "production") {
    return PRODUCTION_BASE_URL;
  }

  return SANDBOX_BASE_URL;
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export async function getDarajaAccessToken(env: DarajaEnv): Promise<Record<string, unknown>> {
  const consumerKey = env.DARAJA_CONSUMER_KEY;
  const consumerSecret = env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing Daraja credentials. Set DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET.");
  }

  const baseUrl = resolveDarajaBaseUrl(env);

  const cached = await env.TOKENS.get<CachedToken>(TOKEN_CACHE_KEY, "json");
  const nowMs = Date.now();

  if (cached && cached.expiresAt > nowMs + TOKEN_REFRESH_BUFFER_SECONDS * 1000) {
    return {
      access_token: cached.accessToken,
      token_type: "Bearer",
      expires_in: Math.max(1, Math.floor((cached.expiresAt - nowMs) / 1000)),
      source: "cache",
      base_url: cached.baseUrl,
      cached_at: cached.fetchedAt
    };
  }

  const authValue = btoa(`${consumerKey}:${consumerSecret}`);
  const tokenUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

  const response = await fetch(tokenUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authValue}`,
      Accept: "application/json"
    }
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      payload = { raw: rawText };
    }
  }

  if (!response.ok) {
    const details = typeof payload.errorMessage === "string"
      ? payload.errorMessage
      : rawText || `Daraja OAuth request failed with status ${response.status}`;

    throw new Error(`Daraja OAuth failed (${response.status}): ${details}`);
  }

  const accessToken = typeof payload.access_token === "string" ? payload.access_token : undefined;
  if (!accessToken) {
    throw new Error("Daraja OAuth response missing access_token.");
  }

  const expiresInSeconds = toPositiveInteger(payload.expires_in, 3599);
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const ttl = Math.max(60, expiresInSeconds - 30);

  const cacheRecord: CachedToken = {
    accessToken,
    expiresAt,
    fetchedAt: new Date().toISOString(),
    baseUrl
  };

  await env.TOKENS.put(TOKEN_CACHE_KEY, JSON.stringify(cacheRecord), {
    expirationTtl: ttl
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresInSeconds,
    source: "daraja",
    base_url: baseUrl
  };
}
