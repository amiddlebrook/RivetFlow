# RivetFlow — Phase 26: Deterministic operator batch

## Purpose

Advances at most 25 simulation steps using the existing concurrency-safe state transition. Stops before human approvals and AI stages; never resolves decisions or invokes inference. Existing run event history remains authoritative.

## Production API

`POST /api/runs/:id/drive`

Example: `{"max_steps":5}`

The endpoint is authenticated through the existing Cloudflare Worker authorization layer. No paid dependency or new mandatory Cloudflare resource is introduced. Production defaults to remote inference disabled; limits and account-wide quotas still apply.

## Interface

The product-specific UI integrates this operation in its existing workflow via `drive-run`. Interactions provide explicit labels and status messages and reuse the application's own visual language.

## Verification

- `npm run check` and `npm run verify:release`
- `npm test`, including `tests/phase26.test.mjs`
- CI and deployment contract checks for the Phase 26 UI and API
- Do not claim browser-level UX acceptance from API smoke tests.

## Not a final enterprise certification

Missing: tenant-level authorization, independent penetration testing, failover/load validation, recoverability drills, realistic end-to-end browser automation and an accessibility audit. These require explicit measured acceptance before any enterprise-production claim.
