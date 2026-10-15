CREATE INDEX IF NOT EXISTS idx_catalog_approvals_cursor ON approvals(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_events_cursor ON events(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_runs_cursor ON runs(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_workflows_cursor ON workflows(created_at DESC,id DESC);
