# Plan Template for Daraja MCP Server

Use this template when working on complex, multi-step tasks.
Codex will follow this structure when you toggle `/plan` mode.

## Task Definition

**Goal:** [What are we trying to achieve?]
**Context:** [Which files/systems are involved?]
**Constraints:** [Security rules, conventions, existing patterns]
**Done When:** [Concrete acceptance criteria]

## Pre-Implementation Checklist

- [ ] Understand affected files and their current behavior
- [ ] Identify existing tests that cover this area
- [ ] Determine if new tests are needed (answer: yes, always)
- [ ] Check for security implications
- [ ] Verify no breaking changes to existing tool responses

## Implementation Plan

### Phase 1: Test First
1. Write/update test file: `tests/<area>.test.ts`
2. Define expected behavior in assertions
3. Run `npm test` — confirm failure

### Phase 2: Implement
4. Make minimal code changes in `src/<file>.ts`
5. Follow existing patterns in the file
6. Use zod for any new input schemas

### Phase 3: Validate
7. Run `npm test` — confirm pass
8. Run `npm run check` — zero type errors
9. Run `npm test` (full suite) — no regressions

### Phase 4: Ship
10. Commit with descriptive message
11. Push feature branch
12. Open PR (never push to main)

## Rollback Plan

If something goes wrong:
- Git stash or reset to last known good state
- The branch can be deleted without affecting main
- KV data is isolated per environment (sandbox vs production)
