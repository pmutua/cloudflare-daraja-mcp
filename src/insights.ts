type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type TransactionRecord = {
  type: string;
  responseStatus?: number;
};

type SummaryResult = {
  total: number;
  byType: Record<string, number>;
  successfulHttp: number;
  failedHttp: number;
};

type EnhancedSummary = {
  source: "workers_ai" | "deterministic";
  text: string;
};

type ListableKv = {
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    cursor?: string;
    list_complete?: boolean;
  }>;
  get(key: string): Promise<string | null>;
};

export function generateTransactionSummary(records: TransactionRecord[]): SummaryResult {
  const byType: Record<string, number> = {};
  let successfulHttp = 0;
  let failedHttp = 0;

  for (const record of records) {
    byType[record.type] = (byType[record.type] ?? 0) + 1;

    if (typeof record.responseStatus === "number") {
      if (record.responseStatus >= 200 && record.responseStatus < 400) {
        successfulHttp += 1;
      } else {
        failedHttp += 1;
      }
    }
  }

  return {
    total: records.length,
    byType,
    successfulHttp,
    failedHttp
  };
}

export async function enhanceSummaryWithAi(ai: AiBinding | undefined, baseSummary: string): Promise<EnhancedSummary> {
  if (!ai) {
    return {
      source: "deterministic",
      text: `Deterministic summary: ${baseSummary}`
    };
  }

  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: `Summarize this payment log insight in 3 concise bullet points:\n${baseSummary}`,
      max_tokens: 220
    });

    const text = typeof response.response === "string"
      ? response.response
      : JSON.stringify(response);

    return {
      source: "workers_ai",
      text
    };
  } catch {
    return {
      source: "deterministic",
      text: `Deterministic summary: ${baseSummary}`
    };
  }
}

function classifyKey(key: string): string {
  if (key.startsWith("stk:")) {
    return "stk";
  }

  if (key.startsWith("status:")) {
    return "status";
  }

  return "other";
}

export async function summarizeTransactionLogs(
  transactionsKv: ListableKv,
  ai: AiBinding | undefined,
  limit = 20
): Promise<Record<string, unknown>> {
  const listed = await transactionsKv.list({ limit });
  const keys = listed.keys ?? [];
  const records: TransactionRecord[] = [];

  for (const key of keys) {
    const raw = await transactionsKv.get(key.name);
    let parsed: Record<string, unknown> = {};

    if (raw) {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }

    records.push({
      type: classifyKey(key.name),
      responseStatus: typeof parsed.responseStatus === "number" ? parsed.responseStatus : undefined
    });
  }

  const summary = generateTransactionSummary(records);
  const baseSummary = [
    `records=${summary.total}`,
    `byType=${JSON.stringify(summary.byType)}`,
    `successfulHttp=${summary.successfulHttp}`,
    `failedHttp=${summary.failedHttp}`
  ].join(", ");

  const enhanced = await enhanceSummaryWithAi(ai, baseSummary);

  return {
    ok: true,
    summary,
    enhancedSummary: enhanced.text,
    source: enhanced.source
  };
}
