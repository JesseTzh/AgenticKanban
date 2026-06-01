package store_test

import (
	"context"
	"database/sql"
	"errors"
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
	if got, want := len(stages), 4; got != want {
		t.Fatalf("stages=%d want=%d", got, want)
	}
}

func createAgentToken(t *testing.T, st *store.Store, id string) {
	t.Helper()
	ctx := context.Background()
	if err := st.CreateUser(ctx, domain.User{ID: id + "-owner", Username: id + "-owner", PasswordHash: "hash", Role: domain.RoleDeveloper}); err != nil {
		t.Fatal(err)
	}
	if _, err := st.DB().Exec(`INSERT INTO agent_tokens(id,name,token_hash,created_by) VALUES(?,?,?,?)`, id, id+" key", id+" hash", id+"-owner"); err != nil {
		t.Fatal(err)
	}
}

func TestAgentWorkflowBreakdownDevelopmentAndCodeReview(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	createAgentToken(t, st, "agent-1")
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature"}, "u")
	if err := st.MarkTaskAgentReady(ctx, task.ID, "u", "requirements ready"); err != nil {
		t.Fatal(err)
	}
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	if err := st.SubmitBreakdown(ctx, task.ID, "agent-1", "split work"); err != nil {
		t.Fatal(err)
	}
	task, _ = st.GetTask(ctx, task.ID)
	if task.StageKey != domain.StageTechnicalBreakdown || task.Status != domain.StatusPendingHumanReview || task.AgentReady {
		t.Fatalf("after breakdown task=%+v", task)
	}
	if err := st.ApproveTask(ctx, task.ID, "reviewer", domain.ReviewApproved, "clear plan"); err != nil {
		t.Fatal(err)
	}
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	repo, _ := st.CreateRepository(ctx, domain.Repository{ProjectID: p.ID, Name: "main"}, "u")
	commit := domain.Commit{ID: "commit-1", SHA: "abc123", Message: "done", Author: "u", Branch: "main"}
	if err := st.SaveWebhookEventAndCommits(ctx, repo, "", nil, []domain.Commit{commit}); err != nil {
		t.Fatal(err)
	}
	if err := st.SubmitDevelopment(ctx, task.ID, "agent-1", "implemented", []string{"abc123"}); err != nil {
		t.Fatal(err)
	}
	task, _ = st.GetTask(ctx, task.ID)
	if task.StageKey != domain.StageCodeReview || task.Status != domain.StatusAgenticReady || !task.AgentReady {
		t.Fatalf("after development task=%+v", task)
	}
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	if err := st.SubmitCodeReview(ctx, task.ID, "agent-1", "looks good", true); err != nil {
		t.Fatal(err)
	}
	if err := st.ApproveTask(ctx, task.ID, "reviewer", domain.ReviewApproved, "confirmed"); err != nil {
		t.Fatal(err)
	}
	task, _ = st.GetTask(ctx, task.ID)
	if task.StageKey != domain.StageTestAcceptance || task.Status != domain.StatusNotReady || task.AgentReady {
		t.Fatalf("after review task=%+v", task)
	}
	detail, err := st.GetAgentWorkDetail(ctx, task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(detail.Runs) != 3 || len(detail.HumanReviews) != 2 {
		t.Fatalf("detail=%+v", detail)
	}
}

func TestClaimAndSubmitRequireSameAgentKey(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature", Status: domain.StatusAgenticReady}, "u")
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	if err := st.ClaimTask(ctx, task.ID, "agent-2"); err != store.ErrInvalidTransition {
		t.Fatalf("second claim err=%v", err)
	}
	if err := st.SubmitBreakdown(ctx, task.ID, "agent-2", "wrong owner"); err != store.ErrAgentClaimMismatch {
		t.Fatalf("submit err=%v", err)
	}
}

func TestSubmitDevelopmentRejectsUnknownSHAAtomically(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "dev", StageKey: domain.StageTechnicalBreakdown, Status: domain.StatusAgenticReady}, "u")
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	err := st.SubmitDevelopment(ctx, task.ID, "agent-1", "done", []string{"missing"})
	if !errors.Is(err, store.ErrCommitSHANotFound) {
		t.Fatalf("err=%v", err)
	}
	var count int
	if err := st.DB().QueryRow(`SELECT COUNT(1) FROM agent_runs WHERE task_id=?`, task.ID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("agent runs=%d", count)
	}
}

func TestRejectBreakdownRequiresHumanReopen(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature", Status: domain.StatusAgenticReady}, "u")
	if err := st.ClaimTask(ctx, task.ID, "agent-1"); err != nil {
		t.Fatal(err)
	}
	if err := st.SubmitBreakdown(ctx, task.ID, "agent-1", "draft"); err != nil {
		t.Fatal(err)
	}
	if err := st.ApproveTask(ctx, task.ID, "reviewer", domain.ReviewRejected, "redo"); err != nil {
		t.Fatal(err)
	}
	task, _ = st.GetTask(ctx, task.ID)
	if task.Status != domain.StatusNeedRedo || task.AgentReady {
		t.Fatalf("task=%+v", task)
	}
	if err := st.MarkTaskAgentReady(ctx, task.ID, "reviewer", "retry"); err != nil {
		t.Fatal(err)
	}
	tasks, err := st.ListAgentTasks(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(tasks) != 1 || len(tasks[0].HumanReviews) != 1 || tasks[0].HumanReviews[0].Note != "redo" {
		t.Fatalf("tasks=%+v", tasks)
	}
}

func TestTestFailureReturnsSameTaskToNeedRedo(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature", StageKey: domain.StageTestAcceptance, Status: domain.StatusNotReady}, "u")
	defectID, err := st.CreateTestRecord(ctx, task.ID, domain.TestFailed, "bug", "tester")
	if err != nil {
		t.Fatal(err)
	}
	if defectID != "" {
		t.Fatalf("defect=%s", defectID)
	}
	task, err = st.GetTask(ctx, task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if task.StageKey != domain.StageTechnicalBreakdown || task.Status != domain.StatusNeedRedo || task.AgentReady {
		t.Fatalf("task=%+v", task)
	}
}

func TestCompleteTaskMarksTestAcceptanceTaskCompleted(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature", StageKey: domain.StageTestAcceptance, Status: domain.StatusAgenticReady}, "u")
	if err := st.CompleteTask(ctx, task.ID, "tester"); err != nil {
		t.Fatal(err)
	}
	task, err := st.GetTask(ctx, task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !task.Completed {
		t.Fatal("expected completed task")
	}
}

func TestAddTaskRefAllowsSameProjectTaskAndIgnoresDuplicate(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p, _ := st.CreateProject(ctx, "demo", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "feature"}, "u")
	referenced, _ := st.CreateTask(ctx, domain.Task{ProjectID: p.ID, Title: "context"}, "u")
	if err := st.AddTaskRef(ctx, task.ID, referenced.ID, "u"); err != nil {
		t.Fatal(err)
	}
	if err := st.AddTaskRef(ctx, task.ID, referenced.ID, "u"); err != nil {
		t.Fatal(err)
	}
	refs, err := st.ListTaskRefs(ctx, task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := len(refs), 1; got != want {
		t.Fatalf("refs=%d want=%d", got, want)
	}
}

func TestAddTaskRefRejectsSelfAndCrossProject(t *testing.T) {
	st := newTestStore(t)
	ctx := context.Background()
	p1, _ := st.CreateProject(ctx, "one", "", "u")
	p2, _ := st.CreateProject(ctx, "two", "", "u")
	task, _ := st.CreateTask(ctx, domain.Task{ProjectID: p1.ID, Title: "feature"}, "u")
	other, _ := st.CreateTask(ctx, domain.Task{ProjectID: p2.ID, Title: "context"}, "u")
	if err := st.AddTaskRef(ctx, task.ID, task.ID, "u"); err != store.ErrInvalidReference {
		t.Fatalf("self ref err=%v", err)
	}
	if err := st.AddTaskRef(ctx, task.ID, other.ID, "u"); err != store.ErrInvalidReference {
		t.Fatalf("cross project ref err=%v", err)
	}
}
