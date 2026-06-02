package db_test

import (
	"path/filepath"
	"testing"

	"agentic-kanban/internal/db"

	_ "modernc.org/sqlite"
)

func TestMigrateCreatesCurrentInitialSchema(t *testing.T) {
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	var count int
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
	if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('tasks') WHERE name='completed'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("completed columns=%d", count)
	}
	if err := database.QueryRow(`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name='task_refs'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("task_refs tables=%d", count)
	}
}
