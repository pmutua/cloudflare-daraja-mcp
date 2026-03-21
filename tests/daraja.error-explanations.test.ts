import { describe, expect, it } from "vitest";
import { explainDarajaErrorCode } from "../src/daraja";

describe("explainDarajaErrorCode", () => {
  it("returns mapped explanation for known error code", () => {
    const result = explainDarajaErrorCode(1032);

    expect(result.found).toBe(true);
    expect(result.code).toBe(1032);
    expect(result.category).toBe("user_action");
    expect(result.explanation.toLowerCase()).toContain("canceled");
  });

  it("returns mapped explanation when code is string", () => {
    const result = explainDarajaErrorCode("1");

    expect(result.found).toBe(true);
    expect(result.code).toBe(1);
    expect(result.explanation.toLowerCase()).toContain("insufficient");
  });

  it("returns unknown result for unmapped code", () => {
    const result = explainDarajaErrorCode(7777);

    expect(result.found).toBe(false);
    expect(result.code).toBe(7777);
    expect(result.nextAction.toLowerCase()).toContain("retry");
  });
});
