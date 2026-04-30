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
4. Configure auth using input variables (never hardcode secrets)
5. Start server, trust it, and verify tool list in Chat

Copy the template from [`examples/vscode-mcp.json`](../examples/vscode-mcp.json) into `.vscode/mcp.json`:

```json
{
  "servers": {
    "daraja": {
      "type": "http",
      "url": "https://<your-domain>/mcp",
      "headers": {
        "x-api-key": "${input:daraja-api-key}"
      }
    }
  },
  "inputs": [
    {
      "id": "daraja-api-key",
      "type": "promptString",
      "description": "Daraja MCP Server API Key",
      "password": true
    }
  ]
}
```

Important:

- Do not commit API keys into `.vscode/mcp.json`.
- The `${input:daraja-api-key}` syntax prompts securely at runtime.
- Use VS Code MCP output logs if startup/tool discovery fails.

## 5. Claude Code Setup

Claude Code supports remote HTTP MCP servers natively.

Add to your project's `.mcp.json` or run `claude mcp add`:

```bash
claude mcp add daraja --transport http --url "https://<your-domain>/mcp" --header "x-api-key: <your-api-key>"
```

Or copy [`examples/claude-code-mcp.json`](../examples/claude-code-mcp.json) to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "daraja": {
      "type": "url",
      "url": "https://<your-domain>/mcp",
      "headers": {
        "x-api-key": "<your-api-key>"
      }
    }
  }
}
```

Verify:

```bash
claude mcp list
```

## 6. Claude Desktop Setup (stdio Bridge Required)

Claude Desktop only supports `stdio` transport. Use `mcp-remote` as a bridge:

Copy [`examples/claude-desktop-config.json`](../examples/claude-desktop-config.json) into your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "daraja": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://<your-domain>/mcp",
        "--header",
        "x-api-key: <your-api-key>"
      ]
    }
  }
}
```

Prerequisites:

- Node.js installed (for `npx`)
- `mcp-remote` bridges stdio ↔ remote HTTP automatically

## 7. Cursor IDE Setup

Cursor supports MCP servers via project or global config.

Add to `.cursor/mcp.json` in your project root. See [`examples/cursor-mcp.json`](../examples/cursor-mcp.json):

```json
{
  "mcpServers": {
    "daraja": {
      "url": "https://<your-domain>/mcp",
      "headers": {
        "x-api-key": "<your-api-key>"
      }
    }
  }
}
```

Then in Cursor: Settings → MCP → verify the server appears and tools are listed.

## 8. Windsurf IDE Setup

Windsurf uses a similar MCP config format. See [`examples/windsurf-mcp.json`](../examples/windsurf-mcp.json):

```json
{
  "mcpServers": {
    "daraja": {
      "serverUrl": "https://<your-domain>/mcp",
      "headers": {
        "x-api-key": "<your-api-key>"
      }
    }
  }
}
```

Place in your project's MCP config location per Windsurf docs, or configure via Windsurf settings.

## 9. OpenAI Codex (as Consumer)

To use this server as a payment tool inside Codex sessions, add to your project's `.codex/config.toml` or `~/.codex/config.toml`.

See [`examples/codex-consumer-config.toml`](../examples/codex-consumer-config.toml):

```toml
[mcp_servers.daraja]
url = "https://<your-domain>/mcp"
headers = { "x-api-key" = "${DARAJA_MCP_API_KEY}" }
```

Set the environment variable:

```bash
export DARAJA_MCP_API_KEY="your-api-key"
```

Then start a Codex session — the Daraja tools will be available for payment operations.

## 10. Other MCP Consumers

For any MCP-compatible client not listed above:

1. Add remote MCP server URL (`https://<your-domain>/mcp`)
2. Configure `x-api-key` header authentication
3. Refresh/reconnect the MCP session
4. Confirm tool discovery and run `get_usage_status` as a smoke test

Use the official MCP clients index for up-to-date client-specific instructions:

- https://modelcontextprotocol.io/clients

## 11. Raw Protocol Smoke Test (Consumer-Agnostic)

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

## 12. End-to-End STK Validation Across Consumers

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

## 13. Security and Operations Checklist

Before enabling in any consumer:

- Use per-environment API keys (dev/staging/prod)
- Never commit credentials in consumer config files
- Restrict which tools are enabled for non-production users
- Monitor logs for repeated auth failures/rate-limit hits
- Keep callback endpoint public, but keep all other routes API-key protected

## 14. Troubleshooting by Symptom

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

## 15. Recommended Consumer Rollout Plan

1. Integrate in one development consumer (for example VS Code)
2. Validate full STK lifecycle in sandbox
3. Add second consumer profile (for example agent runner or internal assistant)
4. Standardize secret handling patterns per consumer
5. Promote same setup pattern to production with release tags and smoke checks
