# Codex Usage Guide for Daraja MCP Server

This document explains how to use OpenAI Codex (CLI, IDE extension, or Codex app) effectively with this project.

## Quick Start

```bash
# Install Codex CLI
npm install -g @openai/codex

# Navigate to this repo
cd daraja_mcp_server

# Start Codex (it automatically reads AGENTS.md)
codex
```

## Configuration

This project ships with a pre-configured `.codex/config.toml` that includes:

### MCP Servers (External Tools)

| Server | Purpose |
|--------|---------|
| **github** | Manage PRs, issues, and repo operations beyond git |
| **context7** | Access up-to-date Cloudflare Workers, MCP SDK, and Daraja docs |
| **cloudflare_bindings** | Manage Workers, KV namespaces, and bindings |
| **cloudflare_observability** | Debug logs and analytics |
| **playwright** | Browser testing and UI validation |

### Custom Agents

| Agent | Role | Mode |
|-------|------|------|
| `codebase_analyst` | Architecture analysis, issue identification, reports | Read-only |
| `refactor_agent` | Implement fixes, refactor, create PRs | Write |
| `pr_explorer` | Map code paths for PR review | Read-only |
| `reviewer` | Security and correctness review | Read-only |
| `integration_builder` | Scaffold new integrations | Write |
| `docs_researcher` | Verify API docs and behavior | Read-only |

### Skills (Reusable Workflows)

| Skill | Trigger |
|-------|---------|
| `$tdd-workflow` | Adding features, fixing bugs, implementing tools |
| `$code-review` | Reviewing PRs, auditing security |
| `$codebase-analyst` | Understanding architecture, identifying issues |
| `$refactor-agent` | Fixing issues, reducing tech debt |
| `$onboarding` | New contributor orientation |
| `$integration-scaffold` | Generating client/webhook/retry code |

## Recommended Workflows

### 1. Codebase Analysis & Issue Discovery

```
Analyze this codebase. Spawn agents:
1. codebase_analyst: full architecture assessment
2. reviewer: security audit
3. pr_explorer: dependency and data flow map

Produce a prioritized report of findings.
```

### 2. Fix an Issue with TDD

```
$tdd-workflow

Fix the issue where [describe problem].
Branch: fix/[issue-name]
```

### 3. PR Review (Multi-Agent)

```
Review this branch against main. Spawn one agent per concern:
1. Security issues
2. Correctness and API contract compliance
3. Test coverage gaps
4. Type safety
5. Daraja-specific concerns (phone format, timestamps, masking)

Summarize findings with severity ratings.
```

### 4. New Integration Scaffold

```
$integration-scaffold

Generate a webhook consumer for Daraja callbacks with:
- Cloudflare Workers runtime
- Payload validation with zod
- Duplicate detection via KV
- Full Vitest test suite
```

### 5. Onboarding a New Contributor

```
$onboarding

I'm new to this project. Give me an interactive tour and suggest a first task based on my experience level: [beginner/intermediate/advanced]
```

### 6. Automated Code Quality

```
Run a full quality pass on this repo:
1. Type check: npm run check
2. Tests: npm test
3. Coverage analysis
4. Security scan for exposed secrets
5. Dead code detection

Report findings and suggest a prioritized fix list.
```

## Environment Setup for Codex

### Required (for full functionality)

```bash
# Set GitHub token for the github MCP server (matches bearer_token_env_var in .codex/config.toml)
export GITHUB_PAT_TOKEN="your-token"

# Set Cloudflare credentials for the cloudflare MCP server
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### Project Secrets (`.dev.vars` — local only)

```
API_KEY=your-local-api-key
DARAJA_CONSUMER_KEY=sandbox-key
DARAJA_CONSUMER_SECRET=sandbox-secret
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=sandbox-passkey
DARAJA_CALLBACK_URL=https://your-tunnel.ngrok.io/callback
```

## Autonomy Levels

| Level | Use Case | Command |
|-------|----------|---------|
| **Suggest** | Learning the codebase, understanding flows | Default |
| **Auto-edit** | Implementing features with review | `--auto-edit` |
| **Full auto** | Trusted workflows (TDD, scaffolding) | `--yolo` |

**Recommendation:** Start with suggest mode. Move to auto-edit for TDD workflows once you trust the agent's understanding of this project.

## Tips for Best Results

1. **Use Plan mode for complex tasks:** Type `/plan` before multi-step work.
2. **Reference specific files:** "Fix the auth check in src/index.ts" is better than "fix auth."
3. **Use skills for repeated patterns:** `$tdd-workflow` is more reliable than explaining TDD every time.
4. **Spawn subagents for parallel work:** Review, analysis, and research can run simultaneously.
5. **Keep threads focused:** One task per thread. Fork for side work.
6. **Update AGENTS.md when Codex makes repeated mistakes:** Add the fix as a rule.

## Non-Interactive Mode (CI/Automation)

```bash
# Run analysis and output report
codex exec "Analyze codebase and produce a quality report as markdown."

# Run specific check
codex exec "Run npm test and report any failures with root cause analysis."

# Generate scaffold
codex exec "Generate a typed MCP client for the stk_push tool with retry logic."
```

## Troubleshooting

- **Codex ignores project rules:** Ensure `AGENTS.md` is in the repo root and contains content.
- **MCP servers not loading:** `codex mcp list` only shows globally-configured servers, not project-scoped ones. To verify project MCP servers load correctly, use `codex exec "List available MCP resources"` or type `/mcp` inside an interactive Codex session. Ensure `npx` is available for stdio servers (context7, playwright).
- **Skills not found:** Ensure `.agents/skills/` exists and SKILL.md files have valid frontmatter.
- **Windows sandbox errors (`CreateProcessAsUserW failed: 1920`):** This is a known limitation of `read-only` sandbox mode on Windows. The sandbox cannot spawn subprocesses in some Windows environments. Codex will fall back to MCP resources and session context. Use `--full-auto` mode for write operations that need shell access.
- **Type errors after changes:** Always run `npm run check` — Codex should do this automatically.
- **Project not trusted:** If Codex ignores `.codex/config.toml`, ensure the project is trusted. Add a trust entry in `~/.codex/config.toml` or accept the trust prompt on first interactive session.
