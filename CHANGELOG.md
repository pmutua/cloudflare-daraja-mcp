# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Documentation

- Reworked README opening sections with beginner-friendly explanation of MCP, use cases, and quick start.
- Added beginner onboarding guide at `docs/BEGINNER_GUIDE.md`.
- Added architecture guide with Mermaid diagrams, sequence flow, and usage examples at `docs/ARCHITECTURE.md`.
- Added curated official learning links for MCP, Cloudflare Workers/KV, Daraja, VS Code MCP usage, and Mermaid.
- Added difficulty labels and estimated reading time to beginner learning links.

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
