import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const devVarsPath = resolve(root, ".dev.vars");
const strictMode = process.argv.includes("--strict");

function parseDotEnv(text) {
  const entries = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
    entries[key] = value;
  }

  return entries;
}

const fileVars = existsSync(devVarsPath)
  ? parseDotEnv(readFileSync(devVarsPath, "utf8"))
  : {};

const merged = {
  ...fileVars,
  ...process.env
};

const required = [
  "API_KEY",
  "DARAJA_CONSUMER_KEY",
  "DARAJA_CONSUMER_SECRET",
  "DARAJA_SHORTCODE",
  "DARAJA_PASSKEY",
  "DARAJA_CALLBACK_URL"
];

const optional = [
  "DARAJA_ENV",
  "DARAJA_BASE_URL",
  "DARAJA_TRANSACTION_TYPE",
  "DEBUG_MODE"
];

const missing = required.filter((name) => !merged[name] || String(merged[name]).trim().length === 0);

function isPlaceholderValue(key, value) {
  const normalized = String(value ?? "").trim();
  if (normalized.length === 0) {
    return false;
  }

  if (normalized.startsWith("replace_with_")) {
    return true;
  }

  if ((key === "DARAJA_CALLBACK_URL" || key === "API_KEY") && normalized.includes("example.com")) {
    return true;
  }

  return false;
}

const placeholders = required.filter((name) => isPlaceholderValue(name, merged[name]));

console.log("Daraja MCP developer doctor");
console.log("");
console.log(`Using .dev.vars: ${existsSync(devVarsPath) ? "yes" : "no"}`);

if (!existsSync(devVarsPath)) {
  console.log("Tip: copy .dev.vars.example to .dev.vars for local wrangler development.");
}

console.log("");

if (missing.length > 0) {
  console.log("Missing required configuration:");
  for (const key of missing) {
    console.log(`- ${key}`);
  }
} else {
  console.log("All required configuration keys are present.");
}

if (placeholders.length > 0) {
  console.log("");
  console.log("Placeholder values detected in required configuration:");
  for (const key of placeholders) {
    console.log(`- ${key}`);
  }
}

console.log("");
console.log("Optional configuration status:");
for (const key of optional) {
  const present = merged[key] && String(merged[key]).trim().length > 0;
  console.log(`- ${key}: ${present ? "set" : "not set"}`);
}

console.log("");
const hasTfToken = process.env.TF_VAR_cloudflare_api_token && String(process.env.TF_VAR_cloudflare_api_token).trim().length > 0;
console.log(`Terraform token via TF_VAR_cloudflare_api_token: ${hasTfToken ? "set" : "not set"}`);

if (strictMode && (missing.length > 0 || placeholders.length > 0)) {
  console.log("");
  console.log("Strict mode is enabled and required keys are missing or still placeholders.");
  process.exitCode = 1;
}
