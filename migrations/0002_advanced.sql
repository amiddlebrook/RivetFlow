ALTER TABLE runs ADD COLUMN request_key TEXT;
ALTER TABLE runs ADD COLUMN request_fingerprint TEXT;
ALTER TABLE runs ADD COLUMN definition_snapshot TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_runs_idempotent ON runs(workflow_id, request_key) WHERE request_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS workflow_revisions(id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL REFERENCES workflows(id),version INTEGER NOT NULL,definition TEXT NOT NULL,description TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(workflow_id,version));
CREATE INDEX IF NOT EXISTS idx_revision_workflow ON workflow_revisions(workflow_id,version DESC);
