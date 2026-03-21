# Release Runbook

This runbook defines a safe, repeatable release process for `daraja-mcp-server`.

## 1. Preconditions

- You are on `main` with a clean working tree for release files.
- Cloudflare credentials are available for Terraform and Wrangler.
- For GitHub Actions deployment, repository or environment secrets are configured:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- GitHub Environments exist:
  - `sandbox` for main branch deploys (Worker name: `daraja-mcp-server-sandbox`)
  - `production` for tag deploys (Worker name from `wrangler.toml`)
- Required secrets are set in the target Worker:
  - `API_KEY`
  - `DARAJA_CONSUMER_KEY`
  - `DARAJA_CONSUMER_SECRET`
  - `DARAJA_SHORTCODE`
  - `DARAJA_PASSKEY`
  - `DARAJA_CALLBACK_URL`

## 2. Local Validation Gate

Run all local checks before release:

```bash
npm install
npm run check
npm test
npm run test:e2e
```

If Terraform changes are included:

```bash
cd infra/terraform
terraform fmt -check
terraform init
terraform validate
cd ../..
```

Do not release if any command fails.

## 3. Infrastructure Apply (When Needed)

Only run this step when KV namespaces, route, or Worker infrastructure changed.

```bash
cd infra/terraform
terraform plan
terraform apply
cd ../..
```

Capture outputs, especially `wrangler_kv_snippet`, and keep `wrangler.toml` in sync.

## 4. Deploy Worker

Preferred path (GitHub Actions staged deployment):

1. Push to `main` to deploy sandbox automatically.
2. Create and push a version tag (`v*`) to deploy production.

Manual fallback (local):

Deploy application code:

```bash
npm run deploy
```

## 5. Post-Deploy Smoke Checks

Run quick endpoint verification against the deployed domain.

1. `GET /health` returns HTTP `200` and `ok: true`.
2. `GET /mcp/tools` returns tool list with HTTP `200` when `x-api-key` is valid.
3. `POST /mcp` rejects missing/invalid `x-api-key` with HTTP `401`.
4. `POST /callback` accepts Daraja callback payload without API key.

## 6. Functional Verification

1. Trigger `get_access_token` and confirm token retrieval.
2. Trigger `simulate_payment` and confirm deterministic simulation response.
3. If sandbox credentials are available, run `stk_push` and confirm record persistence in `TRANSACTIONS`.

## 7. Rollback Strategy

- If deployment introduces regressions, redeploy the previous known-good Worker version.
- If infra change caused issue, revert Terraform changes and apply again.
- Keep callback route available during rollback to avoid dropping Daraja delivery attempts.

## 8. Release Record

For each release, record:

- git commit SHA
- release date/time (UTC)
- environment (sandbox/production)
- Terraform changed: yes/no
- smoke test results
- known issues or follow-up items
