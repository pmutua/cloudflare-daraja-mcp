---
name: integration-scaffold
description: "Generate production-ready integration scaffolds for Daraja MCP Server. USE WHEN: building new integrations, adding auth flows, webhook handlers, retry logic, error mapping, or test suites for MCP tool consumers."
---

# Integration Scaffold Generator

## When to Use
- Building a client that consumes the Daraja MCP server
- Adding webhook/callback handling for a new use case
- Implementing retry and error recovery patterns
- Creating test harnesses for payment flows
- Scaffolding new MCP tools end-to-end

## Scaffold Types

### 1. MCP Tool Client (TypeScript)
Generates a typed client that calls the Daraja MCP server:
- Authentication (API key header)
- Tool invocation with proper MCP protocol
- Response parsing with type safety
- Error handling and retries

### 2. Webhook Consumer
Generates a callback handler:
- Express/Hono/Workers endpoint for POST /callback
- Payload validation (structure + required fields)
- Idempotency handling (duplicate callback detection)
- Structured logging with masked secrets
- Tests for valid, malformed, and duplicate payloads

### 3. Payment Flow Orchestrator
Generates multi-step payment integration:
- OAuth token acquisition (with caching)
- STK Push initiation
- Status polling with backoff
- Callback correlation
- Final verification
- Full test coverage

### 4. Error Recovery Layer
Generates resilient integration patterns:
- Exponential backoff with jitter
- Circuit breaker for Daraja API calls
- Timeout handling
- Error code mapping to user messages
- Retry budget management

## Generated Code Structure

```
scaffold/
  src/
    client.ts       — MCP client with auth
    webhook.ts      — Callback handler
    retry.ts        — Retry/backoff logic
    errors.ts       — Error mapping
    types.ts        — Shared types/schemas
  tests/
    client.test.ts
    webhook.test.ts
    retry.test.ts
    errors.test.ts
  README.md         — Usage documentation
```

## Daraja Error Code Map (for scaffolds)

| Code | Meaning | Retry? |
|------|---------|--------|
| 0 | Success | No |
| 1 | Insufficient balance | No |
| 1032 | Request cancelled by user | No |
| 1037 | DS timeout | Yes |
| 2001 | Wrong PIN | No |
| 1001 | Unable to lock subscriber | Yes |
| 1019 | Transaction expired | Yes (new request) |

## Usage Prompt Examples

```
Generate a webhook consumer for Daraja callbacks with:
- Hono framework
- Payload validation
- Duplicate detection via KV
- Vitest test suite
```

```
Scaffold an MCP tool client that:
- Authenticates with API key
- Calls stk_push with phone number and amount
- Polls check_transaction_status until complete
- Has full retry logic and test coverage
```

```
Create an error recovery layer for Daraja API calls with:
- Exponential backoff (initial: 1s, max: 30s, factor: 2)
- Circuit breaker (5 failures = open for 60s)
- Error code mapping to user-friendly messages
- Vitest tests for all retry scenarios
```
