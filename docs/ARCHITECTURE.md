# RivetFlow | Architecture decision and design review

**Scope:** Human-in-the-loop workflow execution. Standalone deployment on Cloudflare Workers, static assets, D1 and optionally Workers AI within the free allowances.

## System boundaries

Executor advances one step per request; run definitions are snapped at initiation. Approval gates block execution until explicit authorized resolution. Idempotency is per workflow and user-provided request key.

All persistent data is stored in per-application D1. The application frontend and API are deployed together via one Worker; no external hosted DB or paid queue is assumed. GitHub Actions runs TypeScript checks, smoke/integration tests, D1 migrations and Wrangler deployment. The deployment runs a live HTTP smoke check of the Worker URL.

## API integrity

- All `/api/*` routes except `/api/health` are protected by a Worker `ADMIN_TOKEN` bearer secret for the current **single-administrator demo**.
- State-changing methods use parameterized SQL and validation. Detailed `400`, `409`, and `422` responses avoid ambiguous success.
- Existing D1 rows survive deploys; each migration is additive and idempotently tracked by Wrangler.
- The new `0002_advanced.sql` migration installs the application-specific governance and reliability tables.
- JSON responses are uncached. The UI uses `sessionStorage` for the token, not checked-in configuration.

## Domain failure modes

- Duplicate webhook delivery replays: use Idempotency-Key / idempotency_key; hash rejects payload mismatch.
- In-flight definition changes: immutable definition_snapshot on each run.
- Operator cancellation race: guarded status transition, approval invalidation and audit event.
- Untrusted prompt payload: AI output is data, no external side-effect tools are enabled.

## Verification

- `npm run check`: TypeScript strict-mode compilation and frontend syntax.
- `npm test`: SQLite-backed integration tests using a deterministic Workers AI test adapter; never conflated with production provider responses.
- `npm run verify:live`: health, authenticated D1 APIs, static site, and unauthorized API contract after deployment.
- Provisioning script reuses D1 databases and applies migrations before each deployment.

## Design tradeoffs

Free-tier hosting deliberately limits scope. This is not a horizontally scalable, multi-tenant production system; global SLAs, audited governance and paid provider budgets cannot be validated with tiny synthetic workloads. No paid upgrade should occur automatically.
