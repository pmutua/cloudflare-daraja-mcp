---
name: codebase-analyst
description: "Deep analysis of the Daraja MCP Server codebase. USE WHEN: understanding architecture, identifying issues, generating reports, mapping dependencies, finding coverage gaps. Produces structured reports with actionable findings."
---

# Codebase Analyst for Daraja MCP Server

## When to Use
- Initial codebase exploration and understanding
- Architecture assessment and documentation
- Identifying technical debt and quality issues
- Coverage gap analysis
- Dependency and data flow mapping
- Pre-refactoring assessment

## Analysis Workflow

### Step 1: Architecture Map
Read and understand the high-level structure:
```
src/index.ts    → Entry point, routing, auth, rate limiting
src/mcp.ts      → MCP server, tool registration, schemas
src/daraja.ts   → Daraja API integration (OAuth, STK, query)
src/callback.ts → Callback handling, validation, storage
src/rateLimit.ts → Daily quota management via KV
src/observability.ts → Logging, masking, structured output
src/insights.ts → Transaction summarization, AI narratives
src/agents.ts   → Multi-step workflow orchestration
```

### Step 2: Data Flow Analysis
Trace the path of a request through the system:
1. Request → `index.ts` (routing)
2. Auth gate → `isAuthorized()` (constant-time key comparison)
3. Rate limit → `rateLimit.ts` (KV counter check)
4. MCP dispatch → `mcp.ts` (tool lookup, schema validation)
5. Tool execution → `daraja.ts` (API call with masked logging)
6. Response → Structured JSON back to MCP client

### Step 3: Security Audit
Check for:
- Secrets in code, logs, stored data, error messages
- Auth bypass paths
- Unvalidated inputs reaching Daraja API
- Callback spoofing vectors
- Rate limit evasion
- KV data exposure

### Step 4: Test Coverage Analysis
```bash
npm run test:coverage
```
Identify:
- Untested functions and branches
- Missing error path tests
- Integration gaps between modules
- Flaky or non-deterministic tests

### Step 5: Issue Identification
Categorize findings:
- **Critical:** Security vulnerabilities, data exposure
- **High:** Correctness bugs, missing validation
- **Medium:** Code quality, maintainability concerns
- **Low:** Style, documentation gaps

## Report Template

```markdown
# Codebase Analysis Report

## Executive Summary
[1-2 sentences on overall health]

## Architecture Score
- Security: X/10
- Test Coverage: X/10
- Type Safety: X/10
- Maintainability: X/10

## Critical Findings
[List with file:line references]

## Recommendations
[Prioritized action items]

## Coverage Gaps
[Untested paths and suggested tests]

## Dependency Map
[Key imports and data flows]
```

## Multi-Agent Pattern

For comprehensive analysis, use this prompt:
```
Analyze this codebase thoroughly. Spawn agents:
1. codebase_analyst: map architecture and identify issues
2. reviewer: check security and correctness
3. pr_explorer: trace all code paths and dependencies

Summarize combined findings in a prioritized report.
```
