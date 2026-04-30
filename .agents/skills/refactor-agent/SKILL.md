---
name: refactor-agent
description: "Safely refactor code in the Daraja MCP Server. USE WHEN: fixing identified issues, improving code quality, addressing tech debt, restructuring modules. Follows TDD and produces atomic, deployable commits."
---

# Refactor Agent for Daraja MCP Server

## When to Use
- Acting on findings from codebase_analyst
- Fixing security issues
- Reducing technical debt
- Restructuring for better maintainability
- Performance improvements

## Refactoring Principles

1. **One thing at a time.** Each commit changes one behavior.
2. **Tests first.** Write or update tests before touching implementation.
3. **No regressions.** `npm test` must pass after every change.
4. **Type safe.** `npm run check` must pass.
5. **No scope creep.** Only touch code related to the specific fix.
6. **Preserve interfaces.** Don't change response shapes without explicit request.

## Workflow

### For Security Fixes
1. Identify the vulnerability (from analyst report)
2. Write a test that demonstrates the vulnerability
3. Implement the fix (smallest safe change)
4. Verify the test passes
5. Run full suite + type check
6. Commit on `fix/<vulnerability-name>` branch

### For Code Quality Improvements
1. Identify the issue (from analyst report)
2. Ensure existing tests cover the code being changed
3. Refactor incrementally (preserve behavior)
4. Verify tests still pass
5. Run full suite + type check
6. Commit on `refactor/<area>` branch

### For New Feature Implementation
1. Follow TDD skill workflow exactly
2. Branch: `feat/<feature-name>`
3. Schema in mcp.ts → handler in daraja.ts → test in tests/

## Git Discipline

```bash
# Create feature branch
git checkout -b fix/secret-masking-gap

# Make focused commit
git add -A
git commit -m "fix(observability): mask passkey in transaction logs"

# Push for PR
git push origin fix/secret-masking-gap
```

Never push to `main`. Always create a PR.

## Common Refactoring Patterns

### Extract Function
When a function does too much, extract focused helpers.

### Strengthen Types
Replace `any` or loose types with strict interfaces and zod schemas.

### Add Validation
Add input validation at system boundaries (tool inputs, callback payloads).

### Improve Error Handling
Replace generic catches with specific error types and structured messages.

## Verification Checklist
- [ ] `npm run check` passes
- [ ] `npm test` passes
- [ ] No unrelated files changed
- [ ] Commit message follows convention
- [ ] Branch name follows convention
- [ ] Security not weakened
- [ ] Response shapes unchanged (unless explicitly requested)
