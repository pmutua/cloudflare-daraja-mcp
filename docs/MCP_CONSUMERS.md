# MCP Consumer Integration Guide

This guide explains how to use this Daraja MCP server from different MCP consumers (hosts/clients), and how to validate the integration end-to-end.

## 1. What This Server Exposes

Server endpoint and behavior:

- MCP endpoint: `POST/GET https://<your-domain>/mcp`
- Public health: `GET https://<your-domain>/health`
- Daraja callback (for Safaricom): `POST https://<your-domain>/callback`

Auth and protection model:

- `x-api-key` is required for MCP routes (`/mcp`, `/mcp/tools`)
- `/callback` is intentionally unauthenticated so Daraja can post payment outcomes
- Rate limiting applies to protected routes

Main tool surface:

- `get_usage_status`
- `get_access_token`
- `stk_push`
- `check_transaction_status`
- `verify_payment_intent`
- `simulate_payment`
- `explain_error_code`
- `summarize_transaction_logs`
- `orchestrate_payment_workflow`

## 2. MCP Transport Compatibility

This server is a remote MCP server over Streamable HTTP at `/mcp`.

MCP transport notes from official MCP docs:

- MCP supports `stdio` and Streamable HTTP transports.
- Remote servers typically use Streamable HTTP.
- Clients that only support `stdio` need a local bridge/proxy process to forward to remote HTTP.

References:

- MCP transports: https://modelcontextprotocol.io/docs/concepts/transports
- MCP architecture: https://modelcontextprotocol.io/docs/learn/architecture
- MCP client list: https://modelcontextprotocol.io/clients

## 3. Universal Integration Pattern (All Consumers)

No matter which consumer you use, the integration flow is:

1. Add MCP server connection using URL `https://<your-domain>/mcp`
2. Provide authentication (`x-api-key`) securely
3. Start/reload consumer MCP connection
4. Verify tools are discovered (`tools/list` equivalent)
5. Test a safe tool first (`get_usage_status`)
6. Test payment flow (`stk_push` -> callback -> `check_transaction_status`)

## 4. VS Code (Copilot Chat) Setup

Official docs:

- https://code.visualstudio.com/docs/copilot/chat/mcp-servers

Recommended setup:

1. Run `MCP: Add Server` from Command Palette
2. Choose workspace or user scope
3. Use HTTP server type and set URL to `https://<your-domain>/mcp`
4. Configure auth without hardcoding secrets (input variables/environment mechanism)
5. Start server, trust it, and verify tool list in Chat

`mcp.json` shape (illustrative):

```json
{
  "servers": {
    "daraja": {
      "type": "http",
      "url": "https://<your-domain>/mcp"
    }
  }
}
```

Important:

- Do not commit API keys into `.vscode/mcp.json`.
- Keep `x-api-key` in secure input variables or profile-level secret inputs.
- Use VS Code MCP output logs if startup/tool discovery fails.

## 5. Claude Desktop and Other stdio-First Consumers

Some consumers are primarily configured as local `stdio` subprocesses.

Because this Daraja MCP server is remote HTTP:

1. If the consumer supports remote MCP URLs directly, configure URL + auth header.
2. If the consumer only supports `stdio`, run a local MCP bridge/proxy that:
   - exposes `stdio` to the consumer
   - forwards MCP JSON-RPC to `https://<your-domain>/mcp`
   - injects `x-api-key` securely

Validation remains the same:

- ensure tools are listed
- call `get_usage_status`
- run an STK test in sandbox

## 6. Cursor, ChatGPT, and Other MCP Consumers

MCP usage model is generally identical:

1. Add remote MCP server URL (`https://<your-domain>/mcp`)
2. Configure authentication securely
3. Refresh/reconnect the MCP session
4. Confirm tool discovery and run a smoke tool call

Use the official MCP clients index for up-to-date client-specific instructions:

- https://modelcontextprotocol.io/clients

## 7. Raw Protocol Smoke Test (Consumer-Agnostic)

Use these checks to isolate consumer issues from server issues.

### 7.1 Health and Tool Registry

```bash
curl https://<your-domain>/health
curl -H "x-api-key: <your_api_key>" https://<your-domain>/mcp/tools
```

### 7.2 MCP Initialize (JSON-RPC over HTTP)

```bash
curl -X POST "https://<your-domain>/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: <your_api_key>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {"name": "smoke-client", "version": "1.0.0"}
    }
  }'
```

### 7.3 Tool List and Tool Call

```bash
curl -X POST "https://<your-domain>/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: <your_api_key>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

curl -X POST "https://<your-domain>/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: <your_api_key>" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params": {
      "name": "get_usage_status",
      "arguments": {}
    }
  }'
```

## 8. End-to-End STK Validation Across Consumers

For real confidence, run this sequence from the consumer you integrated:

1. `get_access_token` -> verify OAuth success
2. `stk_push` with sandbox-safe values
3. confirm callback arrives at `/callback`
4. `check_transaction_status` using `CheckoutRequestID`
5. `verify_payment_intent` against expected amount/phone

Sandbox essentials:

- Use sandbox shortcode/passkey values
- Use Lipa Na M-Pesa passkey (not Security Credential)
- Callback URL must be public HTTPS

## 9. Security and Operations Checklist

Before enabling in any consumer:

- Use per-environment API keys (dev/staging/prod)
- Never commit credentials in consumer config files
- Restrict which tools are enabled for non-production users
- Monitor logs for repeated auth failures/rate-limit hits
- Keep callback endpoint public, but keep all other routes API-key protected

## 10. Troubleshooting by Symptom

- Tools not visible:
  - Check server is started/reachable
  - Confirm auth header is being sent
  - Check consumer trust/enable state

- `401 unauthorized`:
  - Wrong/missing `x-api-key`
  - Consumer did not include header for MCP calls

- `429 rate_limited`:
  - Daily limit reached; retry after reset

- STK accepted but no completion:
  - Callback URL unreachable or invalid
  - Daraja app provisioning mismatch

- STK query errors (for example 403):
  - permission scope mismatch for query API
  - wrong environment/product binding

## 11. Recommended Consumer Rollout Plan

1. Integrate in one development consumer (for example VS Code)
2. Validate full STK lifecycle in sandbox
3. Add second consumer profile (for example agent runner or internal assistant)
4. Standardize secret handling patterns per consumer
5. Promote same setup pattern to production with release tags and smoke checks
