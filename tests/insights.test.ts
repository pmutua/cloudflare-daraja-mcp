import { describe, expect, it } from "vitest";
import { enhanceSummaryWithAi, generateTransactionSummary } from "../src/insights";

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
});
