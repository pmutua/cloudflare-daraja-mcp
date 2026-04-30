# Daraja MCP Server — Agent Instructions

## Project Overview

This is an MCP (Model Context Protocol) server for Safaricom Daraja APIs, deployed on Cloudflare Workers (TypeScript). It exposes structured payment tools to AI clients with strict security, deterministic behavior, and operational observability.

**Runtime:** Cloudflare Workers  
**Protocol:** MCP over Streamable HTTP (`/mcp`)  
**Storage:** Cloudflare KV (USAGE, TOKENS, TRANSACTIONS, CALLBACKS)  
**Language:** TypeScript (strict mode)  
**Package Manager:** npm  
**Test Framework:** Vitest with Cloudflare Workers pool  

## Repository Layout

```
src/
  index.ts        — Worker routing, auth gate, rate limiting, MCP dispatch
  mcp.ts          — Tool registration, schema definitions, MCP transport
  daraja.ts       — OAuth, STK push/query, payment verification, simulation
  callback.ts     — Callback validation and durable storage
  rateLimit.ts    — Daily request limit implementation
  observability.ts — Structured logging and secret masking
  insights.ts     — Transaction summarization, optional Workers AI narrative
  agents.ts       — Orchestration plan generation for multi-step flows
tests/            — Vitest test suites (unit + integration)
docs/             — Architecture docs, guides, runbooks
scripts/          — Dev tooling (doctor, setup, coverage)
infra/terraform/  — Infrastructure as Code
.github/          — CI/CD workflows and Copilot instructions
.codex/           — OpenAI Codex project config (config.toml, agents/, PLANS.md)
.agents/skills/   — Reusable skill definitions for Codex and Copilot
```

## Essential Commands

```bash
# Install dependencies
npm install

# Type-check (must pass before commit)
npm run check

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Local dev server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Environment validation
npm run doctor
npm run doctor -- --strict
```

## Build, Test, and Lint Expectations

- **Type-check:** `npm run check` must pass with zero errors before any commit.
- **Tests:** `npm test` must pass. All new code requires tests written first (TDD).
- **Coverage:** Do not reduce coverage. Run `npm run coverage:update` after adding tests.
- **No lint errors:** TypeScript strict mode enforced via `tsconfig.json`.

## Architecture Decisions

1. **Security first:** API key auth on all routes except `/health` and `/callback`. Constant-time comparison for keys. Never log secrets or passkeys.
2. **Rate limiting:** Daily per-key request quotas via KV counters. Checked before tool execution.
3. **Deterministic responses:** All tool outputs are structured JSON. No random or time-dependent behavior in responses.
4. **KV namespaces:** USAGE (counters), TOKENS (OAuth cache), TRANSACTIONS (STK audit logs), CALLBACKS (Daraja callback payloads).
5. **MCP SDK:** Uses `@modelcontextprotocol/sdk` with `WebStandardStreamableHTTPServerTransport`.

## MCP Tools (Current)

| Tool | Purpose |
|------|---------|
| `get_usage_status` | Check daily rate limit status |
| `get_access_token` | Obtain Daraja OAuth token |
| `stk_push` | Initiate Lipa Na M-Pesa STK Push |
| `check_transaction_status` | Query STK push result |
| `verify_payment_intent` | Verify payment by amount/phone |
| `simulate_payment` | Simulate payment for testing |
| `explain_error_code` | Explain Daraja error codes |
| `summarize_transaction_logs` | Summarize transaction history |
| `orchestrate_payment_workflow` | Multi-step payment plan |

## Engineering Conventions

- One logical feature per commit. Each commit must be deployable, type-safe, and test-validated.
- Conventional commit format required: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
- TDD workflow: write test → see it fail → implement → pass → type-check → commit.
- Never push directly to `main`. Use feature branches (`feat/`, `fix/`, `chore/`).
- Zod schemas for all tool inputs in `src/mcp.ts`.
- Phone numbers normalized to `2547XXXXXXXX`.
- STK password: `Base64(shortCode + passkey + timestamp)` with Nairobi timezone.
- Mask sensitive fields (Password, passkey) in all logs and stored records.

## Security Rules (Strictly Enforced)

- Never log, store, or expose secrets, passkeys, or auth credentials in plain text.
- Never commit real keys, passkeys, or production endpoints with credentials.
- Keep `.dev.vars` local-only. Use placeholder values in any committed sample files.
- API key enforcement on all routes except `/health` and POST `/callback`.
- The callback route must remain unauthenticated so Safaricom can post results.

## What "Done" Means

Before marking any task complete:
1. `npm run check` passes (zero type errors)
2. `npm test` passes (all suites green)
3. No security violations (secrets exposed, auth bypassed)
4. Code follows existing patterns in the relevant source file
5. If a new tool: schema defined in `mcp.ts`, handler tested, docs updated

## Do-Not Rules

- Do NOT refactor unrelated modules during feature work.
- Do NOT weaken security checks for convenience.
- Do NOT introduce breaking response-shape changes without explicit request.
- Do NOT hardcode credentials anywhere (source, tests, docs, examples).
- Do NOT skip tests. Every feature needs test coverage.
- Do NOT use `git push --force` on shared branches.
- Do NOT add features beyond what was explicitly requested.

## Daraja API Quick Reference

| Endpoint | Path |
|----------|------|
| OAuth | `/oauth/v1/generate?grant_type=client_credentials` |
| STK Push | `/mpesa/stkpush/v1/processrequest` |
| STK Query | `/mpesa/stkpushquery/v1/query` |

- Sandbox base: `https://sandbox.safaricom.co.ke`
- Production base: `https://api.safaricom.co.ke`
- Timestamp format: `YYYYMMDDHHmmss` (Africa/Nairobi)

## Environment Variables

**Required for Daraja operations:**
- `DARAJA_CONSUMER_KEY` — Safaricom app consumer key
- `DARAJA_CONSUMER_SECRET` — Safaricom app consumer secret
- `DARAJA_SHORTCODE` — Business shortcode (Lipa Na M-Pesa)
- `DARAJA_PASSKEY` — Lipa Na M-Pesa passkey
- `DARAJA_CALLBACK_URL` — Public HTTPS callback URL

**Optional:**
- `DARAJA_ENV` — `sandbox` or `production` (default: sandbox)
- `DARAJA_BASE_URL` — Explicit endpoint override
- `DARAJA_TRANSACTION_TYPE` — Default STK transaction type
- `API_KEY` — Required for authenticating MCP clients
- `DEBUG_MODE` — Enable verbose logging

## Onboarding: First Task Suggestions

If you're new to this codebase, try these in order of complexity:

1. **Easy:** Add a new error code explanation to `src/daraja.ts`
2. **Medium:** Add input validation for a new phone number format
3. **Medium:** Add a test for an untested error path in `callback.ts`
4. **Hard:** Implement a new MCP tool with full TDD workflow
5. **Hard:** Add B2C payment support as a new Daraja integration

## Where Things Happen

- **Authentication:** `src/index.ts` → `isAuthorized()` function
- **Rate limiting:** `src/rateLimit.ts` → `checkAndIncrementDailyUsage()`
- **Tool registration:** `src/mcp.ts` → `registerTool()` and tool definitions
- **Daraja calls:** `src/daraja.ts` → OAuth, STK push, query, verify
- **Callbacks:** `src/callback.ts` → `handleDarajaCallback()`
- **Logging:** `src/observability.ts` → `buildRequestLog()`, `buildErrorLog()`
- **AI insights:** `src/insights.ts` → `summarizeTransactionLogs()`
- **Multi-step flows:** `src/agents.ts` → `createPaymentWorkflowPlan()`
