# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Tests

- Added `tests/mcp.test.ts` to cover MCP tool registration, request handling, input mapping, and error-path behavior.
- Expanded `tests/insights.test.ts` with AI fallback and transaction-log summarization scenarios.
- Increased total coverage to over 80% for statements and lines.

### Documentation

- Fixed README Mermaid architecture node syntax for reliable rendering.
- Added detailed MCP consumer integration guide at `docs/MCP_CONSUMERS.md`.
- Added release PR template at `docs/PR_RELEASE_v1.0.1.md`.

### CI/CD

- Added CircleCI pipeline at `.circleci/config.yml` with CI checks, test coverage generation, optional Codecov upload, and gated sandbox/production deployment with smoke tests.

## [1.0.2] - 2026-03-22

### Documentation

- Added release PR template documentation at `docs/PR_RELEASE_v1.0.1.md` to standardize PR summary, validation evidence, rollout checks, and post-merge release steps.

## [1.0.1] - 2026-03-22

### Fixed

- Hardened payment intent verification to gracefully handle malformed callback phone values without throwing.
- Added optional `partyB` override for STK push to better support BuyGoods and advanced recipient configuration.
- Made `transactionDesc` optional for STK push with safe default (`Payment`).
- Extended Daraja error explanation coverage for additional documented numeric and string error codes.
- Enhanced `doctor --strict` to fail when required values are still placeholders.

### Tests

- Added `tests/daraja.edge-cases.test.ts` for malformed callback phone metadata and minimal status payload edge cases.
- Added automated coverage workflow using Vitest V8 provider and README coverage summary sync.
- Added `tests/daraja.stk-push.config.test.ts` for partyB override and optional transaction description behavior.
- Added `tests/doctor.placeholders.test.ts` for strict placeholder detection in developer environment checks.
- Fixed test typing compatibility and added Node type declarations for test execution.

### Documentation

- Reworked README opening sections with beginner-friendly explanation of MCP, use cases, and quick start.
- Added beginner onboarding guide at `docs/BEGINNER_GUIDE.md`.
- Added architecture guide with Mermaid diagrams, sequence flow, and usage examples at `docs/ARCHITECTURE.md`.
- Added curated official learning links for MCP, Cloudflare Workers/KV, Daraja, VS Code MCP usage, and Mermaid.
- Added difficulty labels and estimated reading time to beginner learning links.
- Clarified callback endpoint requirements and STK passkey versus Security Credential guidance.
- Added and expanded TSDoc/JSDoc coverage across core source modules.
- Expanded contributor guidance in `.github/copilot-instructions.md`.

## [1.0.0] - 2026-03-22

### Added

- Bootstrap Cloudflare Worker project and health endpoint.
- MCP server setup with tool registration and transport endpoint.
- API key authentication middleware for protected routes.
- KV-backed daily rate limiting.
- Daraja OAuth token retrieval and KV token caching.
- STK push tool with Daraja password generation and transaction logging.
- Transaction status query with normalized status fields.
- Payment intent verification by amount and optional phone.
- Daraja callback endpoint with callback payload persistence.
- Development payment simulation tool.
- Daraja error explanation tool.
- Workers AI-powered transaction insights enhancement.
- Structured observability and debug logging support.
- Agents orchestration planning layer for future multi-agent runtime.
- Hard route-level end-to-end test coverage.
- Terraform infrastructure for Cloudflare KV and optional Worker resources.
- CI validation workflow for checks, tests, and Terraform validation.
- Release deployment runbook.
- Gated production deployment workflow on release tags.

### Documentation

- Added repository Copilot instructions and workflow standards.

## [0.1.0] - 2026-03-22

### Added

- Initial project skeleton and first deployable feature baseline.
