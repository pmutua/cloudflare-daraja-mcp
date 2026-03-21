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
4. Run `npm run doctor`
5. Run `npm run dev`
6. Open `/health` and confirm service is healthy

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
- Change history: [CHANGELOG.md](../CHANGELOG.md)
