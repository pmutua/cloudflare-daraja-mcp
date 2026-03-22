import { describe, expect, it } from "vitest";
import { enhanceSummaryWithAi, generateTransactionSummary, summarizeTransactionLogs } from "../src/insights";

describe("generateTransactionSummary", () => {
  it("builds aggregate summary from transaction records", () => {
    const result = generateTransactionSummary([
      { type: "stk", responseStatus: 200 },
      { type: "status", responseStatus: 200 },
      { type: "stk", responseStatus: 500 }
    ]);

    expect(result.total).toBe(3);
    expect(result.byType.stk).toBe(2);
    expect(result.byType.status).toBe(1);
    expect(result.successfulHttp).toBe(2);
    expect(result.failedHttp).toBe(1);
  });
});

describe("enhanceSummaryWithAi", () => {
  it("returns fallback summary when AI binding is missing", async () => {
    const result = await enhanceSummaryWithAi(undefined, "base summary");

    expect(result.source).toBe("deterministic");
    expect(result.text).toContain("base summary");
  });

  it("uses AI binding when available", async () => {
    const ai = {
      run: async () => ({ response: "AI summary" })
    };

    const result = await enhanceSummaryWithAi(ai, "base summary");

    expect(result.source).toBe("workers_ai");
    expect(result.text).toBe("AI summary");
  });

  it("falls back when AI binding throws", async () => {
    const ai = {
      run: async () => {
        throw new Error("unavailable");
      }
    };

    const result = await enhanceSummaryWithAi(ai, "base summary");

    expect(result.source).toBe("deterministic");
    expect(result.text).toContain("base summary");
  });
});

describe("summarizeTransactionLogs", () => {
  it("summarizes listed KV entries and classifies key prefixes", async () => {
    const kv = {
      list: async () => ({
        keys: [
          { name: "stk:2026-03-22:1" },
          { name: "status:2026-03-22:2" },
          { name: "other:2026-03-22:3" }
        ]
      }),
      get: async (key: string) => {
        if (key.startsWith("stk:")) {
          return JSON.stringify({ responseStatus: 200 });
        }

        if (key.startsWith("status:")) {
          return JSON.stringify({ responseStatus: 500 });
        }

        return "not-json";
      }
    };

    const result = await summarizeTransactionLogs(kv as any, undefined, 20);

    expect(result.ok).toBe(true);
    expect((result.summary as any).total).toBe(3);
    expect((result.summary as any).byType.stk).toBe(1);
    expect((result.summary as any).byType.status).toBe(1);
    expect((result.summary as any).byType.other).toBe(1);
    expect((result.summary as any).successfulHttp).toBe(1);
    expect((result.summary as any).failedHttp).toBe(1);
    expect(result.source).toBe("deterministic");
  });
});
