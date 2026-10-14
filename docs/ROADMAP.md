# RivetFlow | Production-readiness backlog

These are outstanding engineering requirements, not completed capabilities.

1. Durable state machine via Cloudflare Workflows with retry/backoff and timeout supervision.
2. Workflow schema versioning with full transactional revision publishing.
3. Role-scoped human approvals, organizations, service identities and SSO.
4. Event outbox and connector sandbox for third-party business integrations.

5. External security assessment, threat-model review and scoped tenant identities.
6. Load testing on realistic datasets at stated quotas; baseline p95/p99 and error budgets.
7. Backup/restore drills, deletion/data retention policies, GDPR-related controls where applicable.
8. Accessibility audit, keyboard-only testing, browser E2E and cross-device coverage.
9. SBOM, dependency review, branch protection and deployment provenance/rollback.
10. Production observability and alerting with measured owner response times.
