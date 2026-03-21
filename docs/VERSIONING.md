# Versioning Strategy

This project uses semantic versioning (`MAJOR.MINOR.PATCH`) with release tags in GitHub Actions.

## Rules

- `MAJOR`: breaking API or protocol changes.
- `MINOR`: backward-compatible feature additions.
- `PATCH`: backward-compatible fixes, docs corrections, or CI improvements.

## Tag Format

Use annotated tags with `v` prefix:

- `v1.0.0`
- `v1.0.1`
- `v1.1.0`

The deploy workflow runs in stages:

- push to `main` deploys sandbox
- push tag `v*` deploys production

The release workflow also runs on `v*` tags and publishes a GitHub Release entry.

## Release Procedure

1. Ensure `main` is green in CI.
2. Update [CHANGELOG.md](../CHANGELOG.md) with release notes.
3. Create and push an annotated tag:

```bash
git tag -a v1.0.0 -m "release: v1.0.0"
git push origin v1.0.0
```

4. Confirm deployment workflow success.
5. Confirm release workflow success and generated GitHub Release notes.
6. Run post-deploy smoke checks from [docs/RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md).
