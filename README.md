# Daraja MCP Server

Cloudflare Worker foundation for an MCP server that exposes Safaricom M-Pesa (Daraja) APIs as AI-callable tools.

## Start Here (Beginner Friendly)

If you are new to MCP, read this first:

- [docs/BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md)

In simple terms, this project lets an AI assistant safely do common M-Pesa payment tasks through structured tools.

## What Is an MCP Server?

MCP (Model Context Protocol) is a standard way for AI assistants to call tools.

An MCP server is a service that:

1. defines tools with clear input/output rules
2. receives tool calls from AI clients
3. executes real business actions
4. returns structured responses

In this project, the tools are payment-focused actions like starting STK push and checking transaction status.

## Why This Server Is Useful

Without this server, teams often hardcode payment logic inside chatbot prompts or app glue code.

This server gives you:

1. reusable payment tools any MCP-compatible client can call
2. safer operations via API key auth and rate limits
3. reliable transaction traceability in KV logs
4. cleaner separation between AI behavior and payment infrastructure

## Typical Use Cases

1. AI customer support can trigger STK push after user confirmation.
2. AI checkout assistant can verify if a payment completed.
3. Operations assistant can explain Daraja error codes quickly.
4. Developers can simulate payment flows in sandbox without real charge.

## How It Works (High Level)

1. Your AI client sends a tool call to this server at `/mcp`.
2. The server validates auth and usage limits.
3. The selected tool runs Daraja API logic.
4. Results are returned as structured JSON for the AI client.
5. Callback updates and transaction metadata are stored in KV.

## Quick Start in 5 Minutes

1. Install dependencies: `npm install`
2. Create local vars template: `npm run setup:local`
3. Fill real values in `.dev.vars`
4. Validate config: `npm run doctor`
5. Start local server: `npm run dev`
6. Check health: `GET /health`

If you want a strict config check that fails on missing required values, run: `npm run doctor -- --strict`

## Current Status

Implemented: **Commit 1 - Project Bootstrap**, **Commit 2 - MCP Server Setup**, **Commit 3 - API Key Auth**, **Commit 4 - Rate Limiting (KV)**, **Commit 5 - OAuth Token (Daraja)**, **Commit 6 - STK Push**, **Commit 7 - Transaction Status**, **Commit 8 - Payment Verification Layer**, **Commit 9 - Callback Handler**, **Commit 10 - Simulation Tool**, **Commit 11 - Error Intelligence**, **Commit 12 - Workers AI Integration**, **Commit 13 - Logging + Observability**, **Commit 14 - Agents Integration (Future)**

- Cloudflare Worker project scaffold
- Basic `fetch` handler
- Health endpoint: `GET /health`
- MCP SDK integrated (`@modelcontextprotocol/sdk`)
- MCP server configured as `daraja-mcp-server` v`1.0.0`
- Basic tool registration with initial `get_usage_status` tool
- MCP transport endpoint: `/mcp`
- Tool discovery endpoint: `GET /mcp/tools`
- API key auth middleware for protected routes via `x-api-key`
- KV-backed daily rate limiting middleware (`USAGE` namespace)
- Request limit: `50` requests per UTC day
- Daraja OAuth token tool: `get_access_token`
- Token caching in KV (`TOKENS` namespace)
- STK Push tool: `stk_push`
- Daraja STK password generation: `Base64(shortCode + passkey + timestamp)`
- STK request/response logging in KV (`TRANSACTIONS` namespace)
- Transaction status tool: `check_transaction_status`
- Normalized response fields: `status`, `resultCode`, `responseCode`, `isComplete`
- Payment verification tool: `verify_payment_intent`
- Verification checks: amount matching and optional phone matching
- Callback endpoint: `POST /callback`
- Callback payload storage in KV (`CALLBACKS` namespace)
- Development simulation tool: `simulate_payment` (no external API calls)
- Daraja error explanation tool: `explain_error_code`
- Transaction log summary tool: `summarize_transaction_logs`
- Optional Workers AI enhancement for natural language summaries
- Structured request and error logging utilities
- `DEBUG_MODE=true` enables request/error log emission
- Orchestration planning tool: `orchestrate_payment_workflow`
- Provides agent-to-agent payment workflow plans for future Cloudflare Agents runtime

## Authentication

- Protected routes require header: `x-api-key: <your_api_key>`
- Public route: `GET /health`

Set API key secret before deploy:

```bash
wrangler secret put API_KEY
```

## Rate Limiting (KV)

Create a KV namespace and bind it as `USAGE` in your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "USAGE"
id = "<your-usage-kv-namespace-id>"
preview_id = "<your-usage-kv-preview-id>"
```

If the daily quota is exhausted, protected endpoints return `429`.

## Daraja OAuth

Required secrets:

```bash
wrangler secret put DARAJA_CONSUMER_KEY
wrangler secret put DARAJA_CONSUMER_SECRET
```

Optional secrets/vars:

- `DARAJA_ENV` = `sandbox` (default) or `production`
- `DARAJA_BASE_URL` = custom override for Daraja base URL

Add token cache KV binding in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TOKENS"
id = "<your-tokens-kv-namespace-id>"
preview_id = "<your-tokens-kv-preview-id>"
```

## STK Push

Required configuration:

```bash
wrangler secret put DARAJA_SHORTCODE
wrangler secret put DARAJA_PASSKEY
wrangler secret put DARAJA_CALLBACK_URL
```

Optional:

- `DARAJA_TRANSACTION_TYPE` = `CustomerPayBillOnline` (default) or `CustomerBuyGoodsOnline`

Add transaction log KV binding in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TRANSACTIONS"
id = "<your-transactions-kv-namespace-id>"
preview_id = "<your-transactions-kv-preview-id>"
```

`stk_push` input fields:

- `amount`
- `phoneNumber`
- `accountReference`
- `transactionDesc`
- `callbackUrl` (optional override)
- `transactionType` (optional override)

Set your Daraja callback to this endpoint:

- `https://<your-worker-domain>/callback`

Add callback storage KV binding in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CALLBACKS"
id = "<your-callbacks-kv-namespace-id>"
preview_id = "<your-callbacks-kv-preview-id>"
```

## Run Locally

Quick local setup:

```bash
npm run setup:local
npm install
npm run doctor
```

The doctor command checks required Daraja and API key variables before starting the worker.
Use `npm run doctor -- --strict` when you want missing required keys to fail fast.

```bash
npm install
npm run dev
```

## Test (TDD)

```bash
npm test
```

## Deploy

```bash
npm run deploy
```

## Release Runbook

Use the production checklist in [docs/RELEASE_RUNBOOK.md](docs/RELEASE_RUNBOOK.md) for:

- pre-release validation (`npm run check`, tests, Terraform validate)
- Cloudflare secrets and bindings verification
- deployment sequence (`terraform apply` and `npm run deploy`)
- post-deploy smoke tests for `/health`, `/mcp/tools`, and callback routing

Release governance documents:

- [CHANGELOG.md](CHANGELOG.md)
- [docs/VERSIONING.md](docs/VERSIONING.md)

## Health Check Response

`GET /health`

```json
{
  "ok": true,
  "service": "daraja-mcp-server",
  "status": "healthy",
  "timestamp": "2026-03-22T00:00:00.000Z"
}
```
