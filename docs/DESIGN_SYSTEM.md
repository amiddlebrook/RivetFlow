# RivetFlow: product experience specification

## Product archetype

**Industrial operations floor.** This is an independent visual system, not a shared dashboard with a changed accent color.

## Information architecture

Command rail → process library → operational stage → ticket grid

## Design rationale

Execution state, recovery queues, human approvals, immutable run snapshots. Operators should see work by state instead of scanning unrelated database rows.

## Interaction contract

- Existing authenticated Cloudflare D1 API routes remain unchanged.
- The overview is publicly previewable without exposing private record contents.
- Inspect opens a per-record detail pane; action opens the existing API-backed action form.
- Filter operates on the loaded list and updates card/list records without changing row indices.
- A route change preserves the root credential stored in `sessionStorage`; signing out clears it.
- Desktop and narrow-width layouts use different navigation treatments; scrolling menus preserve all sections.
- User-provided record content is escaped before entering an HTML template.
- Ticket actions retain the existing run/advance/recovery APIs. No fabricated throughput or worker load.

## Test and deploy requirements

1. `npm run check` checks TypeScript, core UI JS, and `workspace.js` parsing.
2. `npm test` checks escaped user-controlled text, action and inspect hooks, route coverage, existing API contracts, and database migrations.
3. Cloudflare deployment smoke check fetches the **new** `workspace.css` and `workspace.js` and asserts the product's unique shell marker.
4. Preserve the Cloudflare Worker `ADMIN_TOKEN` and scoped API-key controls; no frontend secret is checked into Git.

## Unfinished validation

Full visual regression across Chromium/Firefox/WebKit, keyboard-only audits, screen reader testing, axe accessibility reports, usability testing with real users, full E2E actions against a seeded isolated D1 database and cross-browser responsive evaluation remain required before calling this production-ready.
