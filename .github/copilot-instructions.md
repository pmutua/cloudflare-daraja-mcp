# Copilot Instructions for daraja_mcp_server

## Project Purpose
This repository implements an MCP server for Safaricom Daraja APIs on Cloudflare Workers.

## Architecture
- Runtime: Cloudflare Workers (TypeScript)
- Protocol: MCP over HTTP (`/mcp`)
- Storage: Cloudflare KV namespaces
  - `USAGE`: daily rate limit counters
  - `TOKENS`: OAuth token cache
  - `TRANSACTIONS`: STK requests and status logs
  - `CALLBACKS`: Daraja callback payloads
- Public endpoint: `GET /health`
- Callback endpoint: `POST /callback`
- Protected endpoints: all non-health routes except callback

## Functional Commit Discipline
- One logical feature per commit.
- Each commit must be:
  - Deployable
  - Type-safe (`npm run check`)
  - Test-validated (`npm test`)
- Do not bundle unrelated refactors into feature commits.

## TDD Workflow (Required)
For every new feature:
1. Add or update tests first.
2. Run tests and confirm failure (red).
3. Implement minimal code changes.
4. Run tests to pass (green).
5. Run `npm run check`.
6. Commit the feature unit.

## Security Rules
- Never log secrets, passkeys, or auth credentials.
- Mask sensitive fields (for example `Password`) in stored records.
- Keep API key enforcement enabled for protected routes.
- Daraja callback route remains unauthenticated by API key so Safaricom can post results.

## Daraja Integration Rules
- OAuth endpoint: `/oauth/v1/generate?grant_type=client_credentials`
- STK Push endpoint: `/mpesa/stkpush/v1/processrequest`
- STK Query endpoint: `/mpesa/stkpushquery/v1/query`
- STK password: `Base64(shortCode + passkey + timestamp)`
- Timestamp format: `YYYYMMDDHHmmss` (Nairobi time)
- Normalize phone numbers to `2547XXXXXXXX` when validating or comparing.

## MCP Tool Rules
Current tools:
- `get_usage_status`
- `get_access_token`
- `stk_push`
- `check_transaction_status`
- `verify_payment_intent`

When adding tools:
- Use `zod` input schemas in `src/mcp.ts`.
- Return agent-friendly structured output.
- Handle runtime errors and return clear error messages.

## Testing Rules
- Use Vitest test files in `tests/*.test.ts`.
- Add unit tests for pure business logic and endpoint handlers.
- Prefer deterministic tests with in-memory mocks for KV.

## Commands
- Install deps: `npm install`
- Type-check: `npm run check`
- Run tests: `npm test`
- Local dev: `npm run dev`
- Deploy: `npm run deploy`

## Commit Roadmap
Primary roadmap commits:
1. bootstrap
2. MCP setup
3. API key auth
4. rate limiting
5. OAuth token
6. STK push
7. transaction status
8. payment verification
9. callback handler
10. simulation tool
11. error explanations
12. Workers AI integration
13. logging/observability
14. Agents orchestration

Continue implementing in this order unless user explicitly reprioritizes.
