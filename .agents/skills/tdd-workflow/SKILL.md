---
name: tdd-workflow
description: "Execute strict TDD workflow for this Daraja MCP Server project. USE WHEN: adding features, fixing bugs, implementing new MCP tools, writing tests. Follows red-green-refactor with npm run check validation."
---

# TDD Workflow for Daraja MCP Server

## When to Use
- Adding a new MCP tool
- Fixing a bug
- Adding a new Daraja API integration
- Any code change that affects behavior

## Workflow Steps

### 1. Write the Test First
- Create or update test file in `tests/`
- Use Vitest with `@cloudflare/vitest-pool-workers` for worker-specific tests
- Mock KV namespaces with in-memory implementations
- Mock external fetch calls (Daraja API)

### 2. Run Test — Confirm Failure (Red)
```bash
npm test -- --reporter=verbose tests/<your-test-file>.test.ts
```
- The test MUST fail. If it passes, the test doesn't cover the new behavior.

### 3. Implement Minimal Code
- Make the smallest change that makes the test pass
- Follow existing patterns in the relevant source file
- Use zod schemas for input validation
- Mask sensitive fields in any stored data

### 4. Run Test — Confirm Pass (Green)
```bash
npm test -- --reporter=verbose tests/<your-test-file>.test.ts
```

### 5. Type-Check
```bash
npm run check
```
- Must pass with zero errors

### 6. Run Full Suite
```bash
npm test
```
- All existing tests must still pass

### 7. Commit
```bash
git add -A
git commit -m "<type>(<scope>): <description>"
```

## Test File Patterns

### For a new MCP tool:
```typescript
import { describe, it, expect } from "vitest";

describe("tool_name", () => {
  it("returns expected result for valid input", async () => {
    // Arrange: mock env with KV
    // Act: call tool handler
    // Assert: check structured output
  });

  it("returns error for invalid input", async () => {
    // Test validation edge cases
  });

  it("handles upstream API failure gracefully", async () => {
    // Mock fetch to return error
  });
});
```

### For a bug fix:
```typescript
it("regression: <describe the bug>", async () => {
  // Reproduce the exact scenario that triggered the bug
  // Assert the correct behavior
});
```

## Mocking Patterns

### KV Namespace Mock:
```typescript
const mockKV = {
  get: async (key: string) => store[key] ?? null,
  put: async (key: string, value: string) => { store[key] = value; },
  delete: async (key: string) => { delete store[key]; },
};
```

### Fetch Mock (Daraja API):
```typescript
global.fetch = async (url: string, init?: RequestInit) => {
  if (url.includes("/oauth/v1/generate")) {
    return new Response(JSON.stringify({ access_token: "test-token", expires_in: "3600" }));
  }
  return new Response("Not found", { status: 404 });
};
```
