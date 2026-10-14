CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,definition TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY,workflow_id TEXT NOT NULL REFERENCES workflows(id),status TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0,context TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES runs(id),step_index INTEGER NOT NULL,severity TEXT NOT NULL,message TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES runs(id),step_index INTEGER NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,decided_at TEXT);
CREATE INDEX IF NOT EXISTS runs_workflow ON runs(workflow_id,created_at);
CREATE INDEX IF NOT EXISTS event_run ON events(run_id,created_at);
CREATE INDEX IF NOT EXISTS approval_run ON approvals(run_id,status);
