DROP INDEX IF EXISTS idx_tasks_agent_ready;
ALTER TABLE tasks DROP COLUMN locked;
CREATE INDEX IF NOT EXISTS idx_tasks_agent_ready ON tasks(agent_ready, status);

UPDATE tasks SET status = 'pending_human_review' WHERE status = 'pending_confirmation';
UPDATE tasks SET status = 'need_redo', agent_ready = 0 WHERE status = 'needs_changes';

ALTER TABLE agent_runs ADD COLUMN work_type TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_runs ADD COLUMN passed INTEGER;
ALTER TABLE approvals ADD COLUMN agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL;
