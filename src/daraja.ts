const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";
const TOKEN_CACHE_KEY = "daraja:oauth:access_token";
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

const DEFAULT_TRANSACTION_TYPE = "CustomerPayBillOnline";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
  fetchedAt: string;
  baseUrl: string;
};

export type DarajaEnv = {
  TOKENS: KVNamespace;
  TRANSACTIONS: KVNamespace;
  DARAJA_CONSUMER_KEY?: string;
  DARAJA_CONSUMER_SECRET?: string;
  DARAJA_ENV?: string;
  DARAJA_BASE_URL?: string;
  DARAJA_SHORTCODE?: string;
  DARAJA_PASSKEY?: string;
  DARAJA_CALLBACK_URL?: string;
  DARAJA_TRANSACTION_TYPE?: string;
};

export type StkPushInput = {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
  transactionType?: string;
};

export type TransactionStatusInput = {
  checkoutRequestId: string;
};

export type NormalizedTransactionStatus = {
  status: "pending" | "success" | "failed" | "unknown";
  isComplete: boolean;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  resultCode: number | null;
  responseCode: number | null;
  message: string;
  raw: Record<string, unknown>;
};

export type VerifyPaymentIntentInput = {
  checkoutRequestId: string;
  expectedAmount: number;
  expectedPhoneNumber?: string;
};

export type PaymentIntentEvaluationInput = {
  expectedAmount: number;
  expectedPhoneNumber?: string;
};

export type PaymentIntentVerification = {
  state: "pending" | "verified" | "unverified" | "failed";
  verified: boolean;
  amountMatch: "match" | "mismatch" | "unknown";
  phoneMatch: "match" | "mismatch" | "unknown";
  expectedAmount: number;
  actualAmount: number | null;
  expectedPhoneNumber: string | null;
  actualPhoneNumber: string | null;
  reason: string;
  nextAction: string;
  status: NormalizedTransactionStatus;
};

export type SimulatePaymentInput = {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  outcome?: "pending" | "success" | "failed";
};

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

function getNairobiTimestamp(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");

  return `${year}${twoDigits(month)}${twoDigits(day)}${twoDigits(hour)}${twoDigits(minute)}${twoDigits(second)}`;
}

function normalizePhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");

  if (/^2547\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^07\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^7\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  throw new Error("Invalid phone number. Use format 2547XXXXXXXX or 07XXXXXXXX.");
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  return Math.floor(value);
}

function ensureConfigured(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required Daraja configuration: ${name}`);
  }

  return value.trim();
}

function makePassword(shortCode: string, passkey: string, timestamp: string): string {
  return btoa(`${shortCode}${passkey}${timestamp}`);
}

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

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function extractMetadataItems(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  const directMeta = toRecord(raw.CallbackMetadata);
  const directItems = Array.isArray(directMeta?.Item) ? directMeta.Item : null;
  if (directItems) {
    return directItems.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  const body = toRecord(raw.Body);
  const stkCallback = toRecord(body?.stkCallback);
  const callbackMeta = toRecord(stkCallback?.CallbackMetadata);
  const nestedItems = Array.isArray(callbackMeta?.Item) ? callbackMeta.Item : null;
  if (nestedItems) {
    return nestedItems.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  return [];
}

function findMetadataValue(raw: Record<string, unknown>, name: string): unknown {
  const items = extractMetadataItems(raw);
  for (const item of items) {
    if (item.Name === name) {
      return item.Value;
    }
  }

  return undefined;
}

function extractActualAmount(raw: Record<string, unknown>): number | null {
  const fromMetadata = toOptionalNumber(findMetadataValue(raw, "Amount"));
  if (fromMetadata !== null) {
    return fromMetadata;
  }

  return toOptionalNumber(raw.Amount);
}

function extractActualPhoneNumber(raw: Record<string, unknown>): string | null {
  const fromMetadata = findMetadataValue(raw, "PhoneNumber");
  if (fromMetadata !== undefined && fromMetadata !== null) {
    return String(fromMetadata);
  }

  if (typeof raw.PhoneNumber === "string" || typeof raw.PhoneNumber === "number") {
    return String(raw.PhoneNumber);
  }

  return null;
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

async function logStkPushAttempt(
  env: DarajaEnv,
  data: {
    request: Record<string, unknown>;
    responseStatus: number;
    responsePayload: Record<string, unknown>;
    startedAt: string;
    finishedAt: string;
  }
): Promise<void> {
  const responseId = typeof data.responsePayload.CheckoutRequestID === "string"
    ? data.responsePayload.CheckoutRequestID
    : crypto.randomUUID();

  const logKey = `stk:${new Date().toISOString().slice(0, 10)}:${responseId}`;
  await env.TRANSACTIONS.put(
    logKey,
    JSON.stringify({
      ...data,
      recordedAt: new Date().toISOString()
    }),
    {
      expirationTtl: 60 * 60 * 24 * 30
    }
  );
}

export async function stkPush(env: DarajaEnv, input: StkPushInput): Promise<Record<string, unknown>> {
  const shortCode = ensureConfigured(env.DARAJA_SHORTCODE, "DARAJA_SHORTCODE");
  const passkey = ensureConfigured(env.DARAJA_PASSKEY, "DARAJA_PASSKEY");
  const callbackUrl = (input.callbackUrl ?? env.DARAJA_CALLBACK_URL)?.trim();

  if (!callbackUrl) {
    throw new Error("Missing callback URL. Set DARAJA_CALLBACK_URL or provide callbackUrl in tool input.");
  }

  const amount = normalizeAmount(input.amount);
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const accountReference = input.accountReference.trim();
  const transactionDesc = input.transactionDesc.trim();

  if (!accountReference) {
    throw new Error("accountReference is required.");
  }

  if (!transactionDesc) {
    throw new Error("transactionDesc is required.");
  }

  const tokenResult = await getDarajaAccessToken(env);
  const accessToken = typeof tokenResult.access_token === "string" ? tokenResult.access_token : undefined;

  if (!accessToken) {
    throw new Error("Unable to obtain Daraja access token.");
  }

  const timestamp = getNairobiTimestamp(new Date());
  const password = makePassword(shortCode, passkey, timestamp);
  const baseUrl = resolveDarajaBaseUrl(env);
  const endpoint = `${baseUrl}/mpesa/stkpush/v1/processrequest`;

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: (input.transactionType ?? env.DARAJA_TRANSACTION_TYPE ?? DEFAULT_TRANSACTION_TYPE).trim(),
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: shortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc
  };

  const startedAt = new Date().toISOString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });
  const finishedAt = new Date().toISOString();

  const responseText = await response.text();
  let responsePayload: Record<string, unknown> = {};

  if (responseText) {
    try {
      responsePayload = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      responsePayload = { raw: responseText };
    }
  }

  await logStkPushAttempt(env, {
    request: {
      ...payload,
      Password: "***masked***"
    },
    responseStatus: response.status,
    responsePayload,
    startedAt,
    finishedAt
  });

  if (!response.ok) {
    const details = typeof responsePayload.errorMessage === "string"
      ? responsePayload.errorMessage
      : responseText || `STK Push failed with status ${response.status}`;
    throw new Error(`Daraja STK Push failed (${response.status}): ${details}`);
  }

  return {
    ...responsePayload,
    status: "submitted",
    base_url: baseUrl,
    timestamp
  };
}

export function normalizeDarajaTransactionStatus(payload: Record<string, unknown>): NormalizedTransactionStatus {
  const resultCode = toOptionalNumber(payload.ResultCode);
  const responseCode = toOptionalNumber(payload.ResponseCode);
  const checkoutRequestId = typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : null;
  const merchantRequestId = typeof payload.MerchantRequestID === "string" ? payload.MerchantRequestID : null;

  let status: NormalizedTransactionStatus["status"] = "unknown";
  if (resultCode === 0) {
    status = "success";
  } else if (resultCode !== null) {
    status = "failed";
  } else if (responseCode === 0) {
    status = "pending";
  } else if (responseCode !== null) {
    status = "failed";
  }

  const message =
    (typeof payload.ResultDesc === "string" && payload.ResultDesc) ||
    (typeof payload.ResponseDescription === "string" && payload.ResponseDescription) ||
    (typeof payload.CustomerMessage === "string" && payload.CustomerMessage) ||
    "No status message returned by Daraja.";

  return {
    status,
    isComplete: resultCode !== null,
    checkoutRequestId,
    merchantRequestId,
    resultCode,
    responseCode,
    message,
    raw: payload
  };
}

export async function checkTransactionStatus(
  env: DarajaEnv,
  input: TransactionStatusInput
): Promise<NormalizedTransactionStatus> {
  const shortCode = ensureConfigured(env.DARAJA_SHORTCODE, "DARAJA_SHORTCODE");
  const passkey = ensureConfigured(env.DARAJA_PASSKEY, "DARAJA_PASSKEY");
  const checkoutRequestId = input.checkoutRequestId.trim();

  if (!checkoutRequestId) {
    throw new Error("checkoutRequestId is required.");
  }

  const tokenResult = await getDarajaAccessToken(env);
  const accessToken = typeof tokenResult.access_token === "string" ? tokenResult.access_token : undefined;

  if (!accessToken) {
    throw new Error("Unable to obtain Daraja access token.");
  }

  const timestamp = getNairobiTimestamp(new Date());
  const password = makePassword(shortCode, passkey, timestamp);
  const baseUrl = resolveDarajaBaseUrl(env);
  const endpoint = `${baseUrl}/mpesa/stkpushquery/v1/query`;

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  let responsePayload: Record<string, unknown> = {};
  if (responseText) {
    try {
      responsePayload = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      responsePayload = { raw: responseText };
    }
  }

  const normalized = normalizeDarajaTransactionStatus(responsePayload);

  const logKey = `status:${new Date().toISOString().slice(0, 10)}:${checkoutRequestId}`;
  await env.TRANSACTIONS.put(
    logKey,
    JSON.stringify({
      request: {
        ...payload,
        Password: "***masked***"
      },
      responseStatus: response.status,
      normalized,
      recordedAt: new Date().toISOString()
    }),
    {
      expirationTtl: 60 * 60 * 24 * 30
    }
  );

  if (!response.ok) {
    const details = typeof responsePayload.errorMessage === "string"
      ? responsePayload.errorMessage
      : responseText || `STK status query failed with status ${response.status}`;
    throw new Error(`Daraja STK query failed (${response.status}): ${details}`);
  }

  return normalized;
}

export function evaluatePaymentIntent(
  status: NormalizedTransactionStatus,
  input: PaymentIntentEvaluationInput
): PaymentIntentVerification {
  const expectedAmount = normalizeAmount(input.expectedAmount);
  const expectedPhoneNumber = input.expectedPhoneNumber ? normalizePhoneNumber(input.expectedPhoneNumber) : null;

  if (status.status === "pending" || !status.isComplete) {
    return {
      state: "pending",
      verified: false,
      amountMatch: "unknown",
      phoneMatch: expectedPhoneNumber ? "unknown" : "unknown",
      expectedAmount,
      actualAmount: null,
      expectedPhoneNumber,
      actualPhoneNumber: null,
      reason: "Payment is still processing.",
      nextAction: "Retry verification after callback or status completion.",
      status
    };
  }

  if (status.status === "failed") {
    return {
      state: "failed",
      verified: false,
      amountMatch: "unknown",
      phoneMatch: expectedPhoneNumber ? "unknown" : "unknown",
      expectedAmount,
      actualAmount: null,
      expectedPhoneNumber,
      actualPhoneNumber: null,
      reason: status.message,
      nextAction: "Treat payment as failed and request a new payment attempt.",
      status
    };
  }

  const actualAmount = extractActualAmount(status.raw);
  const amountMatch = actualAmount === null
    ? "unknown"
    : Math.abs(actualAmount - expectedAmount) < 0.000001
      ? "match"
      : "mismatch";

  const actualPhoneRaw = extractActualPhoneNumber(status.raw);
  const actualPhoneNumber = actualPhoneRaw ? normalizePhoneNumber(actualPhoneRaw) : null;
  const phoneMatch = expectedPhoneNumber === null
    ? "unknown"
    : actualPhoneNumber === null
      ? "unknown"
      : actualPhoneNumber === expectedPhoneNumber
        ? "match"
        : "mismatch";

  if (amountMatch === "match" && (phoneMatch === "match" || phoneMatch === "unknown")) {
    return {
      state: "verified",
      verified: true,
      amountMatch,
      phoneMatch,
      expectedAmount,
      actualAmount,
      expectedPhoneNumber,
      actualPhoneNumber,
      reason: "Payment intent verified successfully.",
      nextAction: "Mark order as paid and continue fulfillment.",
      status
    };
  }

  return {
    state: "unverified",
    verified: false,
    amountMatch,
    phoneMatch,
    expectedAmount,
    actualAmount,
    expectedPhoneNumber,
    actualPhoneNumber,
    reason: "Payment completed but verification checks did not fully match expected intent.",
    nextAction: "Flag for manual review or request customer confirmation.",
    status
  };
}

export async function verifyPaymentIntent(
  env: DarajaEnv,
  input: VerifyPaymentIntentInput
): Promise<PaymentIntentVerification> {
  const status = await checkTransactionStatus(env, {
    checkoutRequestId: input.checkoutRequestId
  });

  return evaluatePaymentIntent(status, {
    expectedAmount: input.expectedAmount,
    expectedPhoneNumber: input.expectedPhoneNumber
  });
}

export async function simulatePayment(input: SimulatePaymentInput): Promise<Record<string, unknown>> {
  const amount = normalizeAmount(input.amount);
  const phoneNumber = normalizePhoneNumber(input.phoneNumber);
  const accountReference = input.accountReference.trim();
  const transactionDesc = input.transactionDesc.trim();

  if (!accountReference) {
    throw new Error("accountReference is required.");
  }

  if (!transactionDesc) {
    throw new Error("transactionDesc is required.");
  }

  const now = new Date();
  const checkoutRequestId = `sim_${now.getTime()}_${crypto.randomUUID().slice(0, 8)}`;
  const merchantRequestId = `sim_mr_${crypto.randomUUID().slice(0, 8)}`;
  const outcome = input.outcome ?? "pending";

  if (outcome === "success") {
    return {
      simulated: true,
      status: "success",
      resultCode: 0,
      message: "Simulated payment marked as successful.",
      checkoutRequestId,
      merchantRequestId,
      amount,
      phoneNumber,
      accountReference,
      transactionDesc,
      verifiedHint: "Use verify_payment_intent with expectedAmount to validate the simulated result."
    };
  }

  if (outcome === "failed") {
    return {
      simulated: true,
      status: "failed",
      resultCode: 1032,
      message: "Simulated payment marked as failed (user canceled).",
      checkoutRequestId,
      merchantRequestId,
      amount,
      phoneNumber,
      accountReference,
      transactionDesc,
      verifiedHint: "Use check_transaction_status to inspect failed simulation details."
    };
  }

  return {
    simulated: true,
    status: "pending",
    resultCode: null,
    message: "Simulated payment accepted for processing.",
    checkoutRequestId,
    merchantRequestId,
    amount,
    phoneNumber,
    accountReference,
    transactionDesc,
    verifiedHint: "Use verify_payment_intent once simulation outcome is available."
  };
}
