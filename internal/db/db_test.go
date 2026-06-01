package db_test

import (
	"os"
	"path/filepath"
	"testing"

	"agentic-kanban/internal/db"

	_ "modernc.org/sqlite"
)

func TestMigrateUpgradesExistingInitialSchema(t *testing.T) {
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	initialDir := t.TempDir()
	initial, err := os.ReadFile("../../migrations/001_init.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(initialDir, "001_init.sql"), initial, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(database, initialDir); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`INSERT INTO projects(id,name) VALUES('project-1','demo')`); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`INSERT INTO boards(id,project_id,name) VALUES('board-1','project-1','demo')`); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`INSERT INTO board_stages(project_id,stage_key,name,position) VALUES('project-1','done_archive','完成归档',5)`); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`INSERT INTO tasks(id,project_id,title,stage_key,status,created_by) VALUES('task-1','project-1','old','done_archive','archived','u')`); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`INSERT INTO tasks(id,project_id,title,stage_key,status,locked,created_by) VALUES('task-2','project-1','retry','technical_breakdown','pending_confirmation',1,'u')`); err != nil {
		t.Fatal(err)
	}

	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	var status string
	if err := database.QueryRow(`SELECT status FROM tasks WHERE id='task-2'`).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "pending_human_review" {
		t.Fatalf("status=%s", status)
	}
	var count int
	if err := database.QueryRow(`SELECT COUNT(1) FROM board_stages WHERE stage_key='done_archive'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("done archive stages=%d", count)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM task_refs`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name IN ('archives','task_archive_refs')`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("legacy archive tables=%d", count)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('tasks') WHERE name='locked'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("locked columns=%d", count)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('agent_runs') WHERE name IN ('work_type','passed')`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Fatalf("agent run workflow columns=%d", count)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('approvals') WHERE name='agent_run_id'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("approval agent run columns=%d", count)
	}
}
