# Release Runbook

This runbook defines a safe, repeatable release process for `daraja-mcp-server`.

## 1. Preconditions

- You are on `main` with a clean working tree for release files.
- Cloudflare credentials are available for Terraform and Wrangler.
- For CircleCI deployment, project environment variables are configured:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `SANDBOX_USAGE_KV_ID`
  - `SANDBOX_USAGE_KV_PREVIEW_ID`
  - `SANDBOX_TOKENS_KV_ID`
  - `SANDBOX_TOKENS_KV_PREVIEW_ID`
  - `SANDBOX_TRANSACTIONS_KV_ID`
  - `SANDBOX_TRANSACTIONS_KV_PREVIEW_ID`
  - `SANDBOX_CALLBACKS_KV_ID`
  - `SANDBOX_CALLBACKS_KV_PREVIEW_ID`
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
npm run doctor
npm run check
npm test
npm run test:e2e
```

If Terraform changes are included:

```bash
export TF_VAR_cloudflare_api_token="<cloudflare_api_token>"
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

Capture outputs, especially KV IDs, and store them in secure CI variables.

## 4. Deploy Worker

Preferred path (CircleCI):

1. Push to `main` to run validation and sandbox deployment.
2. CircleCI generates a temporary `.wrangler.sandbox.toml` from secure env vars and deploys with that config.

Manual fallback (local):

Generate temporary deploy config from environment variables and deploy:

```bash
node scripts/generate-wrangler-sandbox-config.mjs
npx wrangler deploy --name daraja-mcp-server-sandbox -c .wrangler.sandbox.toml
```

## 5. Post-Deploy Smoke Checks

CircleCI can run these checks automatically after deployment when smoke checks are enabled.
You can still run them manually for incident verification.

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
