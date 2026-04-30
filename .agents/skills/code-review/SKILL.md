---
name: code-review
description: "Perform structured code review for Daraja MCP Server PRs. USE WHEN: reviewing PRs, checking code quality, auditing security, validating test coverage. Produces actionable findings rated by severity."
---

# Code Review for Daraja MCP Server

## When to Use
- Reviewing a PR or branch diff
- Auditing code quality before merge
- Security review of changes touching auth, callbacks, or secrets
- Verifying TDD compliance

## Review Checklist

### Security (Blockers)
- [ ] No secrets, passkeys, or credentials in code, tests, or docs
- [ ] Auth check not bypassed or weakened
- [ ] Sensitive fields masked in logs and stored records
- [ ] Input validation present for all external inputs
- [ ] Callback handler doesn't trust unvalidated payloads
- [ ] Constant-time comparison used for key/secret matching

### Correctness (Blockers/Concerns)
- [ ] Daraja API contract followed (endpoints, params, response shapes)
- [ ] Phone numbers normalized to 2547XXXXXXXX
- [ ] STK password formula: Base64(shortCode + passkey + timestamp)
- [ ] Timestamp uses Africa/Nairobi timezone
- [ ] KV operations use correct namespace (USAGE/TOKENS/TRANSACTIONS/CALLBACKS)
- [ ] Error responses are structured and machine-readable

### Test Coverage (Concerns)
- [ ] New code has corresponding tests
- [ ] Tests written before implementation (TDD evidence in commit history)
- [ ] Both success and error paths covered
- [ ] Regression test for bug fixes
- [ ] Mocks are deterministic (no external dependencies)

### Type Safety (Concerns)
- [ ] `npm run check` passes
- [ ] No `any` types introduced
- [ ] Zod schemas defined for tool inputs
- [ ] Function signatures properly typed

### Maintainability (Suggestions)
- [ ] One logical change per commit
- [ ] No unrelated refactoring bundled
- [ ] Clear naming following existing conventions
- [ ] No dead code or commented-out blocks
- [ ] Documentation updated if behavior changed

## Finding Format

```markdown
### [SEVERITY] Finding Title
**File:** src/example.ts:42
**Category:** security | correctness | testing | types | maintainability

**Description:** What's wrong and why it matters.

**Suggestion:** How to fix it.

**Code:**
\`\`\`typescript
// problematic code
\`\`\`
```

## Severity Levels
- **Blocker:** Must fix before merge. Security issue, data loss, broken behavior.
- **Concern:** Should fix. Potential bug, missing test, weak typing.
- **Suggestion:** Nice to have. Better naming, cleaner pattern, documentation.
- **Nit:** Style preference. No functional impact.

## Multi-Agent Review Pattern

For comprehensive review, spawn parallel agents:
```
Review this branch against main. Have:
- pr_explorer map affected code paths
- reviewer find security and correctness risks
- docs_researcher verify Daraja API contracts
```
