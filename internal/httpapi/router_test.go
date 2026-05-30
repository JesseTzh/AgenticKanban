package httpapi_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"agentic-kanban/internal/auth"
	"agentic-kanban/internal/cache"
	"agentic-kanban/internal/config"
	"agentic-kanban/internal/db"
	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/httpapi"
	"agentic-kanban/internal/permission"
	"agentic-kanban/internal/store"

	_ "modernc.org/sqlite"
)

func newRouter(t *testing.T) http.Handler {
	t.Helper()
	database, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.db")+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = database.Close() })
	if err := db.Migrate(database, "../../migrations"); err != nil {
		t.Fatal(err)
	}
	st := store.New(database, slog.New(slog.NewTextHandler(os.Stdout, nil)))
	cfg := config.Config{AppEnv: "test", HTTPAddr: ":0", SQLitePath: "", SessionSecret: "test-session", SessionTTL: 3600_000_000_000, AgentTokenSecret: "agent-secret", WebhookBaseURL: "http://example.test", LogLevel: "debug"}
	if err := auth.EnsureDefaultAdmin(context.Background(), st, "admin", "admin123", cfg.SessionSecret); err != nil {
		t.Fatal(err)
	}
	c, err := cache.New()
	if err != nil {
		t.Fatal(err)
	}
	p, err := permission.NewEnforcer()
	if err != nil {
		t.Fatal(err)
	}
	return httpapi.NewRouter(httpapi.Dependencies{Config: cfg, Logger: slog.Default(), Store: st, Cache: c, Perm: p})
}

func doJSON(t *testing.T, h http.Handler, method, path string, body any, cookie *http.Cookie) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(method, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		req.AddCookie(cookie)
	}
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	var out map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	return rr, out
}

func TestFullHumanAndCommitFlow(t *testing.T) {
	r := newRouter(t)
	loginRR, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]string{"username": "admin", "password": "admin123"}, nil)
	if loginRR.Code != 200 {
		t.Fatalf("login code=%d body=%s", loginRR.Code, loginRR.Body.String())
	}
	cookie := loginRR.Result().Cookies()[0]

	rr, projectBody := doJSON(t, r, http.MethodPost, "/api/projects", map[string]string{"Name": "Demo", "Description": ""}, cookie)
	if rr.Code != 201 {
		t.Fatalf("create project code=%d body=%s", rr.Code, rr.Body.String())
	}
	projectID := projectBody["ID"].(string)

	rr, _ = doJSON(t, r, http.MethodGet, "/api/projects/"+projectID+"/board", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("board code=%d", rr.Code)
	}
	var stages []domain.Stage
	if err := json.Unmarshal(rr.Body.Bytes(), &stages); err != nil {
		t.Fatal(err)
	}
	if len(stages) != 6 {
		t.Fatalf("stages=%d", len(stages))
	}

	rr, taskBody := doJSON(t, r, http.MethodPost, "/api/projects/"+projectID+"/tasks", map[string]any{"Title": "Build feature", "StageKey": "development_execution", "Status": "agentic_ready"}, cookie)
	if rr.Code != 201 {
		t.Fatalf("create task code=%d body=%s", rr.Code, rr.Body.String())
	}
	taskID := taskBody["ID"].(string)

	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/transitions", map[string]string{"StageKey": "code_review", "Status": "agentic_ready", "Reason": "try"}, cookie)
	if rr.Code != 409 {
		t.Fatalf("expected commit-required conflict, got %d body=%s", rr.Code, rr.Body.String())
	}

	rr, repoBody := doJSON(t, r, http.MethodPost, "/api/projects/"+projectID+"/repositories", map[string]any{"Name": "main", "GitURL": "git@example/repo.git", "WebhookEnabled": true}, cookie)
	if rr.Code != 201 {
		t.Fatalf("repo code=%d body=%s", rr.Code, rr.Body.String())
	}
	repo := repoBody["repository"].(map[string]any)
	webhookPath := "/api/webhooks/" + repo["ID"].(string) + "/" + repo["WebhookSecret"].(string)
	rr, _ = doJSON(t, r, http.MethodPost, webhookPath, map[string]any{"ref": "refs/heads/main", "commits": []map[string]any{{"id": "abc123", "message": "done", "author": map[string]string{"name": "dev"}}}}, nil)
	if rr.Code != 200 {
		t.Fatalf("webhook code=%d body=%s", rr.Code, rr.Body.String())
	}

	rr, _ = doJSON(t, r, http.MethodGet, "/api/projects/"+projectID+"/commits", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("commits code=%d", rr.Code)
	}
	var commits []map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &commits); err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("commits=%d", len(commits))
	}

	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/commits", map[string]string{"CommitID": commits[0]["ID"].(string)}, cookie)
	if rr.Code != 200 {
		t.Fatalf("link code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/transitions", map[string]string{"StageKey": "code_review", "Status": "agentic_ready", "Reason": "ready"}, cookie)
	if rr.Code != 200 {
		t.Fatalf("transition code=%d body=%s", rr.Code, rr.Body.String())
	}
}
