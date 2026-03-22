# Copilot Instructions for daraja_mcp_server

## Project Purpose
This repository implements an MCP server for Safaricom Daraja APIs on Cloudflare Workers.

The main goal is to expose safe, structured payment tools to AI clients while preserving strict security, deterministic behavior, and strong operational observability.

## Architecture
- Runtime: Cloudflare Workers (TypeScript)
- Protocol: MCP over HTTP (/mcp)
- Storage: Cloudflare KV namespaces
  - USAGE: daily rate limit counters
  - TOKENS: OAuth token cache
  - TRANSACTIONS: STK requests and status logs
  - CALLBACKS: Daraja callback payloads
- Public endpoint: GET /health
- Callback endpoint: POST /callback
- Protected endpoints: all non-health routes except callback

### Source Map
- src/index.ts: worker routing, auth gate, rate limiting, MCP dispatch, callback pass-through
- src/mcp.ts: tool registration, schema definitions, MCP transport handler
- src/daraja.ts: OAuth, STK push/query, payment verification, simulation, error-code explanations
- src/callback.ts: callback validation and durable callback storage
- src/rateLimit.ts: daily request limit implementation
- src/observability.ts: structured logging and secret masking
- src/insights.ts: transaction summarization and optional Workers AI narrative
- src/agents.ts: orchestration plan generation for multi-step payment flows

## Functional Commit Discipline
- One logical feature per commit.
- Each commit must be:
  - Deployable
  - Type-safe (npm run check)
  - Test-validated (npm test)
- Do not bundle unrelated refactors into feature commits.
- Prefer small, reviewable diffs focused on one behavior change.

## TDD Workflow (Required)
For every new feature:
1. Add or update tests first.
2. Run tests and confirm failure (red).
3. Implement minimal code changes.
4. Run tests to pass (green).
5. Run npm run check.
6. Commit the feature unit.

For bug fixes:
1. Add a regression test that fails for the current bug.
2. Implement smallest safe fix.
3. Re-run targeted tests and full suite as needed.
4. Run type-check before commit.

## Security Rules
- Never log secrets, passkeys, or auth credentials.
- Mask sensitive fields (for example Password) in logs and stored records.
- Keep API key enforcement enabled for protected routes.
- Daraja callback route remains unauthenticated by API key so Safaricom can post results.
- Do not hardcode credentials in source, tests, docs, or examples.
- Never commit real keys, passkeys, callback secrets, or production endpoints with credentials.
- Treat .dev.vars as local-only; keep placeholders in sample files.

## Configuration Rules
Required runtime secrets for Daraja operations:
- DARAJA_CONSUMER_KEY
- DARAJA_CONSUMER_SECRET
- DARAJA_SHORTCODE
- DARAJA_PASSKEY
- DARAJA_CALLBACK_URL

Optional runtime vars:
- DARAJA_ENV (sandbox or production)
- DARAJA_BASE_URL (explicit endpoint override)
- DARAJA_TRANSACTION_TYPE (default STK transaction type)

Important credential distinction:
- STK uses Lipa Na M-Pesa passkey.
- Security Credential is for other APIs such as B2C/B2B, not STK password generation.

## Daraja Integration Rules
- OAuth endpoint: /oauth/v1/generate?grant_type=client_credentials
- STK Push endpoint: /mpesa/stkpush/v1/processrequest
- STK Query endpoint: /mpesa/stkpushquery/v1/query
- STK password: Base64(shortCode + passkey + timestamp)
- Timestamp format: YYYYMMDDHHmmss (Nairobi time)
- Normalize phone numbers to 2547XXXXXXXX when validating or comparing.
- Keep AccountReference length and TransactionDesc constraints aligned with API expectations.
- Always store STK request and query audit records with masked secret fields.

## MCP Tool Rules
Current tools:
- get_usage_status
- get_access_token
- stk_push
- check_transaction_status
- verify_payment_intent
- simulate_payment
- explain_error_code
- summarize_transaction_logs
- orchestrate_payment_workflow

When adding tools:
- Use zod input schemas in src/mcp.ts.
- Return agent-friendly structured output.
- Handle runtime errors and return clear error messages.
- Keep tool outputs stable and machine-readable.
- Validate and normalize user input before calling upstream APIs.

## API Behavior Rules
- /health stays public and lightweight.
- /callback accepts POST only and returns explicit method/json errors for invalid requests.
- /mcp and management routes remain API-key protected.
- Rate limiting should run before MCP tool execution on protected routes.
- Preserve deterministic response shapes for existing clients.

## Testing Rules
- Use Vitest test files in tests/*.test.ts.
- Add unit tests for pure business logic and endpoint handlers.
- Prefer deterministic tests with in-memory mocks for KV.
- For callback and STK flows, test both success and malformed payload/error paths.
- Add regression tests for every production bug fix.
- Keep tests fast and isolated from live external dependencies by default.

### Validation Before Commit
- npm run check
- npm test
- If affected, run targeted suites such as callback or Daraja edge-case tests

## Commands
- Install deps: `npm install`
- Type-check: `npm run check`
- Run tests: `npm test`
- Local dev: `npm run dev`
- Deploy: `npm run deploy`

Additional useful commands:
- Env validation: npm run doctor
- Strict env validation: npm run doctor -- --strict
- Coverage update: npm run coverage:update

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

## Documentation Rules
- Keep README and docs aligned with actual code behavior.
- When security or credentials behavior changes, update docs in the same feature unit.
- Include concise operator notes for sandbox versus production differences.

## Operational Guidance
- Sandbox should be the default for development and test validation.
- For live validation, verify OAuth first, then STK submission, then callback receipt and status query.
- Callback URL must be public HTTPS and reachable from Safaricom systems.

## Non-Goals and Guardrails
- Do not refactor unrelated modules during feature implementation.
- Do not weaken security checks to simplify local testing.
- Do not introduce breaking response-shape changes without explicit user request.
