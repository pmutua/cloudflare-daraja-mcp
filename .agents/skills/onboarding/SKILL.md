---
name: onboarding
description: "Interactive onboarding for new contributors to the Daraja MCP Server. USE WHEN: someone is new to the project, needs to understand how things work, wants a guided tour, or asks where to start. Provides contextual answers and first-task suggestions."
---

# Onboarding Guide for Daraja MCP Server

## When to Use
- New contributor joining the project
- Someone asks "how does this work?"
- First PR preparation
- Understanding the payment flow
- Finding where to make changes

## Interactive Tour

### Level 1: What Is This?
This is an MCP (Model Context Protocol) server that lets AI assistants interact with Safaricom's M-Pesa Daraja APIs. Think of it as a secure bridge between AI tools and mobile money payments.

**Key insight:** AI clients call MCP tools → this server validates, rate-limits, and forwards to Daraja → returns structured results back to the AI.

### Level 2: How Requests Flow
```
AI Client → POST /mcp
  → Auth check (x-api-key header)
  → Rate limit check (daily quota via KV)
  → MCP tool dispatch (schema validation via zod)
  → Tool handler execution
  → Daraja API call (if needed)
  → Structured JSON response
```

### Level 3: Where Things Live

| Question | Answer |
|----------|--------|
| Where does authentication happen? | `src/index.ts` → `isAuthorized()` |
| Where are tools defined? | `src/mcp.ts` → `registerTool()` calls |
| Where does Daraja communication happen? | `src/daraja.ts` |
| Where are callbacks handled? | `src/callback.ts` → `handleDarajaCallback()` |
| Where is rate limiting? | `src/rateLimit.ts` → `checkAndIncrementDailyUsage()` |
| Where is logging? | `src/observability.ts` |
| Where are tests? | `tests/` directory (Vitest) |
| How do I run locally? | `npm run dev` (uses wrangler) |
| How do I validate? | `npm run check && npm test` |

### Level 4: Security Model
- API key required on all routes except `/health` and POST `/callback`
- Constant-time key comparison (prevents timing attacks)
- Sensitive fields masked in all logs and stored records
- Callback route open for Safaricom but validates payload structure
- Daily rate limits prevent abuse

## First Task Suggestions (By Complexity)

### Beginner (< 1 hour)
1. Add a new Daraja error code explanation to `src/daraja.ts`
2. Improve an existing test with an additional edge case
3. Add a missing type annotation

### Intermediate (1-3 hours)
4. Add phone number validation for a new format (e.g., +254...)
5. Add a test for an untested error path in callback handling
6. Improve structured logging for a specific tool

### Advanced (3+ hours)
7. Implement a new MCP tool with full TDD workflow
8. Add transaction history pagination support
9. Implement webhook signature verification
10. Add B2C/B2B payment support

## Setup Checklist for New Contributors

```bash
# 1. Clone and install
git clone <repo-url>
cd daraja_mcp_server
npm install

# 2. Validate environment
npm run doctor

# 3. Run tests (should all pass)
npm test

# 4. Type check
npm run check

# 5. Start local dev
npm run dev

# 6. Create your feature branch
git checkout -b feat/my-first-contribution
```

## How to Ask Good Questions
- "Where does [X] happen?" → Check the architecture map above
- "How do I test [X]?" → Look at existing tests in `tests/` for patterns
- "What's the right pattern for [X]?" → Follow existing code in the relevant src file
- "Is this safe?" → Check against the security rules in AGENTS.md
