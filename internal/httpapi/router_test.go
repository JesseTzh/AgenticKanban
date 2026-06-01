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
	"strings"
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
	dist := t.TempDir()
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>app</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	return newRouterWithWebDist(t, dist)
}

func newRouterWithWebDist(t *testing.T, webDistPath string) http.Handler {
	t.Helper()
	r, _ := newRouterAndStore(t, webDistPath)
	return r
}

func newRouterAndStore(t *testing.T, webDistPath string) (http.Handler, *store.Store) {
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
	cfg := config.Config{AppEnv: "test", HTTPAddr: ":0", SQLitePath: "", SessionSecret: "test-session", SessionTTL: 3600_000_000_000, AgentTokenSecret: "agent-secret", WebhookBaseURL: "http://example.test", WebDistPath: webDistPath, LogLevel: "debug"}
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
	return httpapi.NewRouter(httpapi.Dependencies{Config: cfg, Logger: slog.Default(), Store: st, Cache: c, Perm: p}), st
}

func TestStaticWebHosting(t *testing.T) {
	dist := t.TempDir()
	if err := os.Mkdir(filepath.Join(dist, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>app</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dist, "assets", "app.js"), []byte("console.log('app')"), 0o644); err != nil {
		t.Fatal(err)
	}
	r := newRouterWithWebDist(t, dist)

	tests := []struct {
		name        string
		method      string
		path        string
		wantCode    int
		wantBody    string
		wantContent string
	}{
		{name: "root serves index", method: http.MethodGet, path: "/", wantCode: 200, wantBody: "<html>app</html>", wantContent: "text/html"},
		{name: "nested frontend path serves index", method: http.MethodGet, path: "/projects/project-1", wantCode: 200, wantBody: "<html>app</html>", wantContent: "text/html"},
		{name: "asset serves file", method: http.MethodGet, path: "/assets/app.js", wantCode: 200, wantBody: "console.log('app')", wantContent: "text/javascript"},
		{name: "head asset serves headers", method: http.MethodHead, path: "/assets/app.js", wantCode: 200, wantBody: "", wantContent: "text/javascript"},
		{name: "unknown api returns json not found", method: http.MethodGet, path: "/api/unknown", wantCode: 404, wantBody: `{"data":null,"error":{"code":"not_found","message":"not found"}}`, wantContent: "application/json"},
		{name: "unknown post returns json not found", method: http.MethodPost, path: "/unknown", wantCode: 404, wantBody: `{"data":null,"error":{"code":"not_found","message":"not found"}}`, wantContent: "application/json"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rr := httptest.NewRecorder()

			r.ServeHTTP(rr, req)

			if rr.Code != tt.wantCode {
				t.Fatalf("code=%d body=%s", rr.Code, rr.Body.String())
			}
			if rr.Body.String() != tt.wantBody {
				t.Fatalf("body=%q", rr.Body.String())
			}
			if contentType := rr.Header().Get("Content-Type"); !strings.Contains(contentType, tt.wantContent) {
				t.Fatalf("Content-Type=%q", contentType)
			}
		})
	}
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
	_ = json.Unmarshal(responseData(t, rr), &out)
	return rr, out
}

func doAgentJSON(t *testing.T, h http.Handler, method, path string, body any, token string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(method, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	var out map[string]any
	_ = json.Unmarshal(responseData(t, rr), &out)
	return rr, out
}

func responseData(t *testing.T, rr *httptest.ResponseRecorder) json.RawMessage {
	t.Helper()
	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode envelope: %v body=%s", err, rr.Body.String())
	}
	return envelope.Data
}

func assertErrorEnvelope(t *testing.T, rr *httptest.ResponseRecorder, wantCode int, wantErrorCode, wantMessage string) {
	t.Helper()
	if rr.Code != wantCode {
		t.Fatalf("code=%d body=%s", rr.Code, rr.Body.String())
	}
	var envelope struct {
		Data  any `json:"data"`
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode envelope: %v body=%s", err, rr.Body.String())
	}
	if envelope.Data != nil || envelope.Error.Code != wantErrorCode || envelope.Error.Message != wantMessage {
		t.Fatalf("body=%s", rr.Body.String())
	}
}

func TestAPIEnvelopes(t *testing.T) {
	r := newRouter(t)

	rr, health := doJSON(t, r, http.MethodGet, "/api/health", nil, nil)
	if rr.Code != 200 || health["ok"] != true {
		t.Fatalf("health code=%d body=%s", rr.Code, rr.Body.String())
	}

	loginRR, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]string{"username": "admin", "password": "admin123"}, nil)
	if loginRR.Code != 200 {
		t.Fatalf("login code=%d body=%s", loginRR.Code, loginRR.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodGet, "/api/projects", nil, loginRR.Result().Cookies()[0])
	if rr.Code != 200 || string(responseData(t, rr)) != "[]" {
		t.Fatalf("projects code=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAPIAuthenticationErrorEnvelopes(t *testing.T) {
	r := newRouter(t)

	rr, _ := doJSON(t, r, http.MethodGet, "/api/projects", nil, nil)
	assertErrorEnvelope(t, rr, 401, "unauthorized", "unauthorized")

	req := httptest.NewRequest(http.MethodGet, "/api/agent/tasks", nil)
	req.Header.Set("Authorization", "Bearer invalid")
	rr = httptest.NewRecorder()
	r.ServeHTTP(rr, req)
	assertErrorEnvelope(t, rr, 401, "unauthorized", "unauthorized")
}

func TestLoginCookiePersistence(t *testing.T) {
	r := newRouter(t)

	tests := []struct {
		name       string
		remember   bool
		wantMaxAge int
	}{
		{name: "session cookie by default", remember: false, wantMaxAge: 0},
		{name: "persistent cookie when remembered", remember: true, wantMaxAge: 3600},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]any{
				"username": "admin",
				"password": "admin123",
				"remember": tt.remember,
			}, nil)
			if rr.Code != 200 {
				t.Fatalf("login code=%d body=%s", rr.Code, rr.Body.String())
			}
			cookies := rr.Result().Cookies()
			if len(cookies) != 1 {
				t.Fatalf("cookies=%d", len(cookies))
			}
			if cookies[0].MaxAge != tt.wantMaxAge {
				t.Fatalf("MaxAge=%d want=%d", cookies[0].MaxAge, tt.wantMaxAge)
			}
			if !cookies[0].HttpOnly {
				t.Fatal("session cookie must remain HttpOnly")
			}
		})
	}
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
	if err := json.Unmarshal(responseData(t, rr), &stages); err != nil {
		t.Fatal(err)
	}
	if len(stages) != 4 {
		t.Fatalf("stages=%d", len(stages))
	}

	rr, taskBody := doJSON(t, r, http.MethodPost, "/api/projects/"+projectID+"/tasks", map[string]any{"Title": "Build feature", "StageKey": "code_review", "Status": "agentic_ready"}, cookie)
	if rr.Code != 201 {
		t.Fatalf("create task code=%d body=%s", rr.Code, rr.Body.String())
	}
	taskID := taskBody["ID"].(string)
	if taskBody["StageKey"] != domain.StageRequirementClarification || taskBody["Status"] != domain.StatusNotReady {
		t.Fatalf("task=%v", taskBody)
	}
	rr, keyBody := doJSON(t, r, http.MethodPost, "/api/agent-tokens", map[string]string{"Name": "codex"}, cookie)
	if rr.Code != 201 {
		t.Fatalf("create key code=%d body=%s", rr.Code, rr.Body.String())
	}
	token := keyBody["token"].(string)
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/agent-ready", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("agent ready code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/claim", nil, token)
	if rr.Code != 200 {
		t.Fatalf("claim breakdown code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/submit-breakdown", map[string]string{"Result": "split work"}, token)
	if rr.Code != 200 {
		t.Fatalf("submit breakdown code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/approvals", map[string]string{"Decision": "approved", "Note": "clear plan"}, cookie)
	if rr.Code != 200 {
		t.Fatalf("approve breakdown code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/claim", nil, token)
	if rr.Code != 200 {
		t.Fatalf("claim development code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/submit-development", map[string]any{"Result": "done", "CommitSHAs": []string{"missing"}}, token)
	assertErrorEnvelope(t, rr, 409, "commit_sha_not_found", "commit sha not found: missing")
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/submit-development", map[string]any{"Result": "done", "CommitSHAs": []string{}}, token)
	if rr.Code != 409 {
		t.Fatalf("expected commit required, got %d body=%s", rr.Code, rr.Body.String())
	}

	rr, repoBody := doJSON(t, r, http.MethodPost, "/api/projects/"+projectID+"/repositories", map[string]any{"Name": "main", "GitURL": "git@example/repo.git", "WebhookEnabled": true}, cookie)
	if rr.Code != 201 {
		t.Fatalf("repo code=%d body=%s", rr.Code, rr.Body.String())
	}
	repo := repoBody["repository"].(map[string]any)
	webhookPath := "/api/webhooks/" + repo["ID"].(string) + "/" + repo["WebhookSecret"].(string)
	rr, _ = doJSON(t, r, http.MethodPost, "/api/webhooks/"+repo["ID"].(string)+"/invalid", map[string]any{}, nil)
	assertErrorEnvelope(t, rr, 401, "invalid_webhook_secret", "invalid webhook secret")
	rr, _ = doJSON(t, r, http.MethodPost, webhookPath, map[string]any{"ref": "refs/heads/main", "commits": []map[string]any{{"id": "abc123", "message": "done", "author": map[string]string{"name": "dev"}}}}, nil)
	if rr.Code != 200 {
		t.Fatalf("webhook code=%d body=%s", rr.Code, rr.Body.String())
	}

	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/submit-development", map[string]any{"Result": "done", "CommitSHAs": []string{"abc123"}}, token)
	if rr.Code != 200 {
		t.Fatalf("submit development code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/claim", nil, token)
	if rr.Code != 200 {
		t.Fatalf("claim review code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/"+taskID+"/submit-code-review", map[string]any{"Result": "looks good", "Passed": true}, token)
	if rr.Code != 200 {
		t.Fatalf("submit review code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodGet, "/api/tasks/"+taskID+"/agent-work", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("agent work code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/approvals", map[string]string{"Decision": "approved", "Note": "confirmed"}, cookie)
	if rr.Code != 200 {
		t.Fatalf("approve review code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/complete", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("complete code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, referenceBody := doJSON(t, r, http.MethodPost, "/api/projects/"+projectID+"/tasks", map[string]any{"Title": "Reference context"}, cookie)
	if rr.Code != 201 {
		t.Fatalf("create reference task code=%d body=%s", rr.Code, rr.Body.String())
	}
	referenceID := referenceBody["ID"].(string)
	rr, _ = doJSON(t, r, http.MethodPost, "/api/tasks/"+taskID+"/refs", map[string]string{"ReferencedTaskID": referenceID}, cookie)
	if rr.Code != 200 {
		t.Fatalf("add task ref code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ = doJSON(t, r, http.MethodGet, "/api/tasks/"+taskID+"/refs", nil, cookie)
	if rr.Code != 200 {
		t.Fatalf("task refs code=%d body=%s", rr.Code, rr.Body.String())
	}
	var refs []domain.Task
	if err := json.Unmarshal(responseData(t, rr), &refs); err != nil {
		t.Fatal(err)
	}
	if len(refs) != 1 || refs[0].ID != referenceID {
		t.Fatalf("refs=%v", refs)
	}
}

func TestRemovedWorkflowRoutesReturnNotFound(t *testing.T) {
	r := newRouter(t)
	loginRR, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]string{"username": "admin", "password": "admin123"}, nil)
	cookie := loginRR.Result().Cookies()[0]
	for _, path := range []string{
		"/api/tasks/task-1/lock",
		"/api/tasks/task-1/unlock",
		"/api/tasks/task-1/transitions",
		"/api/tasks/task-1/reviews",
	} {
		rr, _ := doJSON(t, r, http.MethodPost, path, nil, cookie)
		assertErrorEnvelope(t, rr, 404, "not_found", "not found")
	}
	rr, _ := doAgentJSON(t, r, http.MethodPost, "/api/agent/tasks/task-1/submit", nil, "invalid")
	assertErrorEnvelope(t, rr, 404, "not_found", "not found")
}

func TestAgentTokenListsAreScopedToOwnerUnlessAdmin(t *testing.T) {
	dist := t.TempDir()
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>app</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	r, st := newRouterAndStore(t, dist)
	if err := st.CreateUser(context.Background(), domain.User{ID: "developer-1", Username: "developer", PasswordHash: auth.HashPassword("developer123", "test-session"), Role: domain.RoleDeveloper}); err != nil {
		t.Fatal(err)
	}
	adminLogin, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]string{"username": "admin", "password": "admin123"}, nil)
	developerLogin, _ := doJSON(t, r, http.MethodPost, "/api/auth/login", map[string]string{"username": "developer", "password": "developer123"}, nil)
	adminCookie := adminLogin.Result().Cookies()[0]
	developerCookie := developerLogin.Result().Cookies()[0]
	if rr, _ := doJSON(t, r, http.MethodPost, "/api/agent-tokens", map[string]string{"Name": "admin-key"}, adminCookie); rr.Code != 201 {
		t.Fatalf("admin create key code=%d body=%s", rr.Code, rr.Body.String())
	}
	if rr, _ := doJSON(t, r, http.MethodPost, "/api/agent-tokens", map[string]string{"Name": "developer-key"}, developerCookie); rr.Code != 201 {
		t.Fatalf("developer create key code=%d body=%s", rr.Code, rr.Body.String())
	}
	rr, _ := doJSON(t, r, http.MethodGet, "/api/agent-tokens", nil, developerCookie)
	var developerKeys []map[string]any
	if err := json.Unmarshal(responseData(t, rr), &developerKeys); err != nil {
		t.Fatal(err)
	}
	if len(developerKeys) != 1 || developerKeys[0]["name"] != "developer-key" {
		t.Fatalf("developer keys=%v", developerKeys)
	}
	if _, ok := developerKeys[0]["token"]; ok {
		t.Fatalf("listed key leaked plaintext: %v", developerKeys[0])
	}
	rr, _ = doJSON(t, r, http.MethodGet, "/api/agent-tokens", nil, adminCookie)
	var adminKeys []map[string]any
	if err := json.Unmarshal(responseData(t, rr), &adminKeys); err != nil {
		t.Fatal(err)
	}
	if len(adminKeys) != 2 {
		t.Fatalf("admin keys=%v", adminKeys)
	}
}
