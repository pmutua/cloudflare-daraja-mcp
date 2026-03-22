# PR Template: Release v1.0.1

Use this content when opening the PR from `release/v1.0.1` to `main` (if your workflow requires a PR).

## Title

`chore(release): prepare v1.0.1`

## Summary

This PR prepares release `v1.0.1` for the Daraja MCP server.

Scope of this release:

- Daraja STK edge-case hardening and safer defaults.
- Improved test reliability and typing compatibility.
- Expanded operational and integration documentation.
- Version and changelog synchronization for release tagging.

## Included Changes

### Runtime and behavior

- Align STK flow with Daraja 3.0 edge requirements.
- Support optional `partyB` override for advanced recipient flows.
- Default `transactionDesc` safely when omitted.
- Expand Daraja error explanation coverage.

### Testing and reliability

- Add/extend tests for STK config and callback-related edge cases.
- Add strict placeholder validation test and supporting checks.
- Fix test typing compatibility and add Node typings.

### Documentation

- Expand callback and credential usage guidance.
- Add detailed consumer integration guide: `docs/MCP_CONSUMERS.md`.
- Add TSDoc across core runtime modules.
- Expand contributor guidance in `.github/copilot-instructions.md`.

### Release metadata

- Bump package version to `1.0.1`.
- Sync `package-lock.json` version metadata.
- Add `1.0.1` entry in `CHANGELOG.md`.
- Add local annotated tag `v1.0.1`.

## Validation Evidence

Executed locally:

- `npm run check`
- `npm test -- tests/daraja.stk-push.config.test.ts tests/callback-handler.test.ts`

Expected outcome:

- Type-check passes.
- Targeted test suites pass.

## Risk Assessment

Risk level: Low to Medium

Reasons:

- Main logic adjustments are additive and covered by tests.
- Largest surface area is documentation and release metadata.
- Daraja environment/provisioning behavior remains external dependency.

## Rollout and Verification

1. Merge PR.
2. Ensure CI is green on `main`.
3. Push release tag `v1.0.1`.
4. Confirm deployment workflows complete.
5. Run post-deploy checks from `docs/RELEASE_RUNBOOK.md`.

## Post-merge Commands

```bash
git checkout main
git pull
# if tag not already pushed
git push origin v1.0.1
```

## Notes

- This repository currently has no configured `origin` remote in local environment.
- Configure remote before pushing branch/tag.
