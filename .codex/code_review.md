# Code Review Standards for Daraja MCP Server

## Review Priority Order

1. **Security** — Is anything exposed that shouldn't be?
2. **Correctness** — Does it do what it claims?
3. **Tests** — Is the change tested?
4. **Types** — Is it type-safe?
5. **Maintainability** — Can the next person understand it?

## Automatic Blockers (Must Fix Before Merge)

- Secret/credential in code, test, or documentation
- Auth bypass or weakening of security gate
- Missing test for new behavior
- `npm run check` fails
- `npm test` fails
- Response shape changed without migration plan
- Push to main (must use PR)

## Daraja-Specific Review Points

- Phone number format validated and normalized (2547XXXXXXXX)
- STK password uses correct formula: Base64(shortCode + passkey + timestamp)
- Timestamp uses Africa/Nairobi timezone (YYYYMMDDHHmmss)
- OAuth tokens properly cached and refreshed
- Transaction records have masked sensitive fields
- Callback handler validates payload structure before storage
- Rate limit checked before tool execution in request flow

## Test Expectations

- Every new function has at least one test
- Error paths tested (not just happy path)
- Mocks are deterministic (no network, no time-dependency)
- Bug fixes include a regression test
- Integration tests mock Daraja API responses

## Commit Standards

- Format: `<type>(<scope>): <description>`
- Types: feat, fix, chore, docs, test, refactor
- One logical change per commit
- Commit must be independently deployable
- No WIP or fixup commits in PRs

## What a Good PR Looks Like

1. Clear title describing the behavior change
2. Description explaining why, not just what
3. Linked to issue if applicable
4. Tests added/updated
5. `npm run check` and `npm test` passing in CI
6. No unrelated changes
7. Reasonable diff size (< 300 lines preferred)
