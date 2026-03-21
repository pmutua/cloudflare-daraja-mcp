# Daraja MCP Server

Cloudflare Worker foundation for an MCP server that exposes Safaricom M-Pesa (Daraja) APIs as AI-callable tools.

## Current Status

Implemented: **Commit 1 - Project Bootstrap**, **Commit 2 - MCP Server Setup**, **Commit 3 - API Key Auth**, **Commit 4 - Rate Limiting (KV)**, **Commit 5 - OAuth Token (Daraja)**, **Commit 6 - STK Push**, **Commit 7 - Transaction Status**, **Commit 8 - Payment Verification Layer**, **Commit 9 - Callback Handler**, **Commit 10 - Simulation Tool**

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
