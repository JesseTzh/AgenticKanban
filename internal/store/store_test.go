package store_test

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"agentic-kanban/internal/db"
	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/store"

	_ "modernc.org/sqlite"
)

func newTestStore(t *testing.T) *store.Store {
	t.Helper()
	dir := t.TempDir()
	database, err := sql.Open("sqlite", filepath.Join(dir, "test.db")+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })
	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}
	return store.New(database, slog.New(slog.NewTextHandler(os.Stdout, nil)))
}

func TestProjectCreatesDefaultBoard(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, err := st.CreateProject(ctx, "demo", "", "tester")
	if err != nil {
		t.Fatal(err)
	}
	stages, err := st.Board(ctx, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := len(stages), 6; got != want {
		t.Fatalf("stages=%d want=%d", got, want)
	}
}

func TestCodeReviewRequiresCommit(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, err := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "dev", StageKey: domain.StageDevelopmentExecution, Status: domain.StatusAgenticReady}, "u")
	if err != nil {
		t.Fatal(err)
	}
	err = st.TransitionTask(ctx, task.ID, domain.StageCodeReview, domain.StatusAgenticReady, "u", "try review")
	if err != store.ErrCommitRequired {
		t.Fatalf("err=%v want ErrCommitRequired", err)
	}
}

func TestTestFailureCreatesDefectTask(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature", StageKey: domain.StageTestAcceptance, Status: domain.StatusAgenticReady}, "u")
	defectID, err := st.CreateTestRecord(ctx, task.ID, domain.TestFailed, "bug", "tester")
	if err != nil {
		t.Fatal(err)
	}
	if defectID == "" {
		t.Fatal("expected defect task id")
	}
	defect, err := st.GetTask(ctx, defectID)
	if err != nil {
		t.Fatal(err)
	}
	if defect.ParentID != task.ID {
		t.Fatalf("defect parent=%s want=%s", defect.ParentID, task.ID)
	}
	if defect.StageKey != domain.StageDevelopmentExecution {
		t.Fatalf("stage=%s", defect.StageKey)
	}
}
