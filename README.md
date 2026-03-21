# Daraja MCP Server

Cloudflare Worker foundation for an MCP server that exposes Safaricom M-Pesa (Daraja) APIs as AI-callable tools.

## Current Status

Implemented: **Commit 1 - Project Bootstrap**

- Cloudflare Worker project scaffold
- Basic `fetch` handler
- Health endpoint: `GET /health`

## Run Locally

```bash
npm install
npm run dev
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
