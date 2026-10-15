-- An approval decision, run cursor change, and audit event are a single SQLite transaction.
-- Existing records are preserved. No external provider or paid infrastructure required.
CREATE TRIGGER IF NOT EXISTS approval_decision_atomic
AFTER UPDATE OF status ON approvals
FOR EACH ROW
WHEN OLD.status = 'pending' AND NEW.status IN ('approved','rejected')
BEGIN
  UPDATE runs
  SET cursor = CASE WHEN NEW.status = 'approved' THEN cursor + 1 ELSE cursor END,
      status = CASE
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN cursor + 1 >= COALESCE((
          SELECT json_array_length(json_extract(
            COALESCE(NULLIF(runs.definition_snapshot,''), workflows.definition),
            '$.steps'))
          FROM workflows WHERE workflows.id = runs.workflow_id
        ),0) THEN 'completed'
        ELSE 'running'
      END,
      updated_at = NEW.decided_at
  WHERE id = NEW.run_id AND status = 'waiting_approval' AND cursor = NEW.step_index;

  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT,'Approval run state changed') END;

  INSERT INTO events(id,run_id,step_index,severity,message,detail,created_at)
  VALUES(lower(hex(randomblob(16))),NEW.run_id,NEW.step_index,
         CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
         'Approval ' || NEW.status, json_object('note',NEW.note),NEW.decided_at);
END;
