import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(process.cwd(), "scripts", "doctor.mjs");

describe("doctor placeholder validation", () => {
  it("fails strict mode when required variables are placeholders", () => {
    const dir = mkdtempSync(join(tmpdir(), "daraja-doctor-"));

    try {
      writeFileSync(
        join(dir, ".dev.vars"),
        [
          "API_KEY=replace_with_local_api_key",
          "DARAJA_CONSUMER_KEY=replace_with_consumer_key",
          "DARAJA_CONSUMER_SECRET=replace_with_consumer_secret",
          "DARAJA_SHORTCODE=replace_with_shortcode",
          "DARAJA_PASSKEY=replace_with_passkey",
          "DARAJA_CALLBACK_URL=https://example.com/callback"
        ].join("\n")
      );

      const result = spawnSync("node", [scriptPath, "--strict"], {
        cwd: dir,
        encoding: "utf8"
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("placeholder");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
