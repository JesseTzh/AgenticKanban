package db_test

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"agentic-kanban/internal/db"

	_ "modernc.org/sqlite"
)

func TestMigrateUpgradesExistingInitialSchema(t *testing.T) {
	database, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db")+"?_pragma=foreign_keys(1)")
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

	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	var completed int
	if err := database.QueryRow(`SELECT completed FROM tasks LIMIT 1`).Scan(&completed); err != sql.ErrNoRows {
		t.Fatalf("old task query err=%v want=%v", err, sql.ErrNoRows)
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
}
