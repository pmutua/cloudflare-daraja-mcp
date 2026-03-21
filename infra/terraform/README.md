# Terraform Infrastructure (Cloudflare)

This Terraform module provisions core Cloudflare resources for `daraja-mcp-server`.

## What It Creates

- KV namespace for `USAGE`
- KV namespace for `TOKENS`
- KV namespace for `TRANSACTIONS`
- KV namespace for `CALLBACKS`
- Optional Worker script deployment (`manage_script = true`)
- Optional Worker route binding (`create_route = true`)

## Prerequisites

- Terraform >= 1.6
- Cloudflare API token with permissions for Workers and KV

## Quick Start

1. Copy example vars:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. Fill in real values in `terraform.tfvars`.

3. Initialize and apply:

```bash
terraform init
terraform plan
terraform apply
```

4. Copy `wrangler_kv_snippet` output into your `wrangler.toml`.

## Notes

- Current app deployment path can remain Wrangler-based (`npm run deploy`).
- Set `manage_script=true` only if you provide a pre-built JS bundle path via `worker_bundle_path`.
- API secrets (`API_KEY`, `DARAJA_*`) should still be set using `wrangler secret put ...`.
