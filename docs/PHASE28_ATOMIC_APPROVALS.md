# Phase 28 — Atomic operator approval transactions

**Problem corrected:** a human approval previously wrote the approval decision, execution cursor, and operational event in separate database operations. A failure between writes could leave a decision accepted but its execution still awaiting approval, or no event recorded.

**Implemented:** the `0014_atomic_approvals.sql` migration installs an `AFTER UPDATE` SQLite trigger. On a conditional pending-to-approved/rejected transition it advances/rejects the associated execution and records the approval event in the **same database transaction**. If any write fails, SQLite rolls back the entire decision. A stale run cursor, already-decided approval, duplicate request, or missing event-store capacity cannot leave a half-committed approval.

**Safety and acceptance:**
- Conditional update rejects state races and repeated decisions with HTTP 409.
- A rejected approval does not advance the execution cursor.
- Transactionally inserted event captures the written human note and UTC decision time.
- The unchanged post-decision API returns the latest execution, approval and event records.
- Four new database-backed tests include an injected event-write exception to prove rollback.
- GitHub runs SQLite integration tests and D1 migration preflight before deploying; Chromium acceptance runs after the live Cloudflare deployment.

This is a production correctness improvement for **one organization per deployment**. It does not promise exactly-once external side effects, automatic durable processing, or security certification. No paid services or additional Cloudflare products are introduced.
