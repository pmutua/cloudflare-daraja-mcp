type CallbackStore = {
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    }
  ): Promise<void>;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function extractCheckoutRequestId(payload: Record<string, unknown>): string {
  const directId = payload.CheckoutRequestID;
  if (typeof directId === "string" && directId.trim().length > 0) {
    return directId;
  }

  const body = payload.Body;
  if (typeof body === "object" && body !== null) {
    const stkCallback = (body as Record<string, unknown>).stkCallback;
    if (typeof stkCallback === "object" && stkCallback !== null) {
      const nestedId = (stkCallback as Record<string, unknown>).CheckoutRequestID;
      if (typeof nestedId === "string" && nestedId.trim().length > 0) {
        return nestedId;
      }
    }
  }

  return crypto.randomUUID();
}

export async function handleDarajaCallback(request: Request, callbacksKv: CallbackStore): Promise<Response> {
  if (request.method !== "POST") {
    return json({
      ok: false,
      error: "method_not_allowed",
      message: "Use POST for callback payloads"
    }, 405);
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json<Record<string, unknown>>();
  } catch {
    return json({
      ok: false,
      error: "invalid_json",
      message: "Callback body must be valid JSON"
    }, 400);
  }

  const checkoutRequestId = extractCheckoutRequestId(payload);
  const key = `callback:${new Date().toISOString().slice(0, 10)}:${checkoutRequestId}`;

  await callbacksKv.put(
    key,
    JSON.stringify({
      payload,
      receivedAt: new Date().toISOString(),
      checkoutRequestId
    }),
    {
      expirationTtl: 60 * 60 * 24 * 30
    }
  );

  return json({
    ok: true,
    stored: true,
    checkoutRequestId
  });
}
