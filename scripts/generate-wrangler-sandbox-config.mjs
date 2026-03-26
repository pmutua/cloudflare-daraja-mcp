import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "wrangler.toml");
const outputPath = path.join(root, ".wrangler.sandbox.toml");

const requiredKv = [
  { binding: "USAGE", idVar: "SANDBOX_USAGE_KV_ID", previewVar: "SANDBOX_USAGE_KV_PREVIEW_ID" },
  { binding: "TOKENS", idVar: "SANDBOX_TOKENS_KV_ID", previewVar: "SANDBOX_TOKENS_KV_PREVIEW_ID" },
  { binding: "TRANSACTIONS", idVar: "SANDBOX_TRANSACTIONS_KV_ID", previewVar: "SANDBOX_TRANSACTIONS_KV_PREVIEW_ID" },
  { binding: "CALLBACKS", idVar: "SANDBOX_CALLBACKS_KV_ID", previewVar: "SANDBOX_CALLBACKS_KV_PREVIEW_ID" }
];

const missing = requiredKv.filter((kv) => !process.env[kv.idVar] || !process.env[kv.previewVar]);
if (missing.length > 0) {
  const vars = missing.flatMap((kv) => [kv.idVar, kv.previewVar]);
  console.error(`Missing required KV namespace environment variables: ${vars.join(", ")}`);
  process.exit(1);
}

const base = fs.readFileSync(sourcePath, "utf8");
const lines = base.split(/\r?\n/);
const cleaned = [];
let skipKvBlock = false;

for (const line of lines) {
  if (line.trim() === "[[kv_namespaces]]") {
    skipKvBlock = true;
    continue;
  }

  if (skipKvBlock) {
    if (line.trim() === "") {
      skipKvBlock = false;
    }
    continue;
  }

  cleaned.push(line);
}

const kvBlocks = requiredKv
  .map(
    (kv) =>
      `[[kv_namespaces]]\n` +
      `binding = \"${kv.binding}\"\n` +
      `id = \"${process.env[kv.idVar]}\"\n` +
      `preview_id = \"${process.env[kv.previewVar]}\"\n`
  )
  .join("\n");

const output = `${cleaned.join("\n").trim()}\n\n${kvBlocks}`;
fs.writeFileSync(outputPath, output, "utf8");
console.log(`Generated ${outputPath}`);
