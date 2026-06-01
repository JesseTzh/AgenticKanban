ALTER TABLE tasks ADD COLUMN completed INTEGER NOT NULL DEFAULT 0;

DELETE FROM tasks WHERE stage_key IN ('development_execution', 'done_archive');
DELETE FROM board_stages WHERE stage_key IN ('development_execution', 'done_archive');
UPDATE board_stages SET name = '代码审核', position = 3 WHERE stage_key = 'code_review';
UPDATE board_stages SET position = 4 WHERE stage_key = 'test_acceptance';

DROP TABLE IF EXISTS task_archive_refs;
DROP TABLE IF EXISTS archives;

CREATE TABLE IF NOT EXISTS task_refs (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  referenced_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(task_id, referenced_task_id)
);
