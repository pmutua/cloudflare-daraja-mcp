# Beginner Guide: Daraja MCP Server

This guide explains what this project is, why it exists, and how to use it if you are new to MCP.

## 1. The Problem This Project Solves

Many teams want an AI assistant to help with M-Pesa payment tasks.

Common pain points:

- AI can answer questions, but cannot directly perform secure payment operations.
- Payment logic gets mixed into app code and prompts, making maintenance hard.
- Teams lack a clean audit trail for payment interactions.

This MCP server solves that by exposing payment actions as structured tools.

## 2. What MCP Means in Practice

MCP stands for Model Context Protocol.

Think of it as a tool-calling contract between:

- an AI client (agent, assistant, or app)
- a server that provides tools

Your AI does not call Daraja directly.
It calls this MCP server, and this server handles Daraja requests safely.

## 3. What This Server Can Do

Main capabilities:

1. Get Daraja OAuth access token (`get_access_token`)
2. Start STK push request (`stk_push`)
3. Check payment status (`check_transaction_status`)
4. Verify payment intent (`verify_payment_intent`)
5. Accept Daraja callback updates (`POST /callback`)
6. Simulate payment during development (`simulate_payment`)
7. Explain Daraja error codes (`explain_error_code`)

## 4. Basic Flow Example

A simple payment journey:

1. Customer agrees to pay.
2. AI calls `stk_push` through MCP.
3. Customer approves on phone.
4. Daraja sends callback to `/callback`.
5. AI calls `check_transaction_status` or `verify_payment_intent`.
6. Assistant tells user whether payment succeeded.

## 5. Security Model (Simple View)

- `/health` is public for uptime checks.
- `/callback` is open so Safaricom can post callback payloads.
- Other routes require `x-api-key`.
- Daily request limits are enforced with Cloudflare KV.
- Sensitive values are masked in debug logs.

## 6. Local Setup for Beginners

1. Run `npm install`
2. Run `npm run setup:local`
3. Edit `.dev.vars` with real values
4. Ensure `DARAJA_CALLBACK_URL` points to a real public HTTPS endpoint ending in `/callback`
5. For STK Push, use the Lipa Na M-Pesa Online passkey (not Security Credential)
6. Run `npm run doctor`
7. Run `npm run dev`
8. Open `/health` and confirm service is healthy

Note: In sandbox, STK requests can be accepted even before final callback delivery. Your integration is only complete when callback payloads are received at `/callback`.

## 7. When To Use This Project

Use this project when:

- you want an AI assistant to handle M-Pesa payment operations
- you need repeatable tool definitions instead of prompt-only automation
- you want auditability and safer controls around payment actions

Not ideal when:

- you do not need AI tool calling
- your app already has a mature non-AI payment backend and no agent use case

## 8. Where To Go Next

- Runtime and operations checklist: [docs/RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md)
- Version and release process: [docs/VERSIONING.md](VERSIONING.md)
- Architecture diagrams and examples: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Coverage workflow and latest summary: [README.md](../README.md#test-coverage-report)
- Manual Codecov CLI upload (Windows/Linux/macOS): [README.md](../README.md#codecov-cli-upload-manual-local-os)
- Pre-commit quality gate: [README.md](../README.md#pre-commit-hook)
- Change history: [CHANGELOG.md](../CHANGELOG.md)

## 9. Curated Learning Resources

Start with these in order if you are new.
Estimated times are approximate and based on first-pass reading.

1. What MCP is and why it matters:
	- Beginner, ~10 min: https://modelcontextprotocol.io/introduction
2. How MCP is structured (client, server, tools, transport):
	- Beginner, ~15 min: https://modelcontextprotocol.io/docs/learn/architecture
3. Formal MCP spec reference:
	- Intermediate, ~20-30 min skim: https://spec.modelcontextprotocol.io/
4. How to use MCP servers in VS Code:
	- Beginner, ~15 min: https://code.visualstudio.com/docs/copilot/chat/mcp-servers
5. Cloudflare Workers fundamentals:
	- Beginner, ~10 min: https://developers.cloudflare.com/workers/
6. Wrangler CLI commands and configuration:
	- Beginner, ~15 min: https://developers.cloudflare.com/workers/wrangler/
7. Workers KV getting started:
	- Beginner, ~15 min: https://developers.cloudflare.com/kv/get-started/
8. Safaricom Daraja docs home:
	- Beginner, ~5 min: https://developer.safaricom.co.ke/
9. Daraja API catalog and onboarding:
	- Beginner, ~10 min: https://developer.safaricom.co.ke/apis
	- Beginner, ~15 min: https://developer.safaricom.co.ke/apis/GettingStarted
10. Mermaid diagrams for architecture docs:
	- Beginner, ~10 min: https://mermaid.js.org/intro/
	- Beginner, hands-on: https://mermaid.live/edit
