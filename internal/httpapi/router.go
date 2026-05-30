package httpapi

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"agentic-kanban/internal/auth"
	"agentic-kanban/internal/cache"
	"agentic-kanban/internal/config"
	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/permission"
	"agentic-kanban/internal/store"

	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	Config config.Config
	Logger *slog.Logger
	Store  *store.Store
	Cache  *cache.Cache
	Perm   *permission.Enforcer
}

type api struct{ d Dependencies }

func NewRouter(d Dependencies) http.Handler {
	if d.Config.AppEnv == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery(), requestLogger(d.Logger))
	a := &api{d: d}
	r.GET("/api/health", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })
	r.POST("/api/auth/login", a.login)

	authn := r.Group("/api", a.session())
	authn.POST("/auth/logout", a.logout)
	authn.GET("/me", a.me)
	authn.GET("/projects", a.require("project", "read"), a.projects)
	authn.POST("/projects", a.require("project", "write"), a.createProject)
	authn.GET("/projects/:projectID", a.require("project", "read"), a.project)
	authn.PUT("/projects/:projectID", a.require("project", "write"), a.updateProject)
	authn.DELETE("/projects/:projectID", a.require("project", "delete"), a.deleteProject)
	authn.GET("/projects/:projectID/board", a.require("project", "read"), a.board)
	authn.GET("/projects/:projectID/tasks", a.require("task", "read"), a.tasks)
	authn.POST("/projects/:projectID/tasks", a.require("task", "write"), a.createTask)
	authn.GET("/tasks/:taskID", a.require("task", "read"), a.task)
	authn.PUT("/tasks/:taskID", a.require("task", "update"), a.updateTask)
	authn.DELETE("/tasks/:taskID", a.require("task", "delete"), a.deleteTask)
	authn.POST("/tasks/:taskID/transitions", a.require("task", "update"), a.transitionTask)
	authn.POST("/tasks/:taskID/lock", a.require("task", "update"), a.lockTask(true))
	authn.POST("/tasks/:taskID/unlock", a.require("task", "update"), a.lockTask(false))
	authn.POST("/tasks/:taskID/approvals", a.require("task", "update"), a.approveTask)
	authn.GET("/projects/:projectID/repositories", a.require("repository", "read"), a.repositories)
	authn.POST("/projects/:projectID/repositories", a.require("repository", "write"), a.createRepository)
	authn.PUT("/repositories/:repoID", a.require("repository", "write"), a.updateRepository)
	authn.DELETE("/repositories/:repoID", a.require("repository", "delete"), a.deleteRepository)
	authn.GET("/projects/:projectID/commits", a.require("commit", "read"), a.commits)
	authn.POST("/tasks/:taskID/commits", a.require("commit", "write"), a.linkCommit)
	authn.DELETE("/tasks/:taskID/commits/:commitID", a.require("commit", "write"), a.unlinkCommit)
	authn.POST("/tasks/:taskID/reviews", a.require("review", "write"), a.review)
	authn.POST("/tasks/:taskID/tests", a.require("test", "write"), a.testRecord)
	authn.POST("/tasks/:taskID/archives", a.require("archive", "write"), a.archive)
	authn.GET("/projects/:projectID/archives", a.require("archive", "read"), a.archives)
	authn.POST("/tasks/:taskID/archive-refs", a.require("archive", "write"), a.archiveRef)
	authn.GET("/agent-tokens", a.require("agent", "read"), a.agentTokens)
	authn.POST("/agent-tokens", a.require("agent", "write"), a.createAgentToken)

	r.POST("/api/webhooks/:repoID/:secret", a.webhook)
	agent := r.Group("/api/agent", a.agentAuth())
	agent.GET("/tasks", a.agentTasks)
	agent.POST("/tasks/:taskID/claim", a.agentClaim)
	agent.POST("/tasks/:taskID/submit", a.agentSubmit)

	r.NoRoute(func(c *gin.Context) { c.JSON(404, gin.H{"error": "not found"}) })
	return r
}

func requestLogger(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info("http", slog.String("method", c.Request.Method), slog.String("path", c.FullPath()), slog.Int("status", c.Writer.Status()), slog.Duration("latency", time.Since(start)))
	}
}
func (a *api) current(c *gin.Context) domain.User {
	v, _ := c.Get("user")
	if u, ok := v.(domain.User); ok {
		return u
	}
	return domain.User{}
}
func (a *api) session() gin.HandlerFunc {
	return func(c *gin.Context) {
		tok, err := c.Cookie("ak_session")
		if err != nil || tok == "" {
			unauth(c)
			return
		}
		h := auth.HashToken(tok, a.d.Config.SessionSecret)
		if v, ok := a.d.Cache.Get("session:" + h); ok {
			c.Set("user", v.(domain.User))
			c.Next()
			return
		}
		u, err := a.d.Store.GetSessionUser(c.Request.Context(), h)
		if err != nil {
			unauth(c)
			return
		}
		a.d.Cache.Set("session:"+h, u, time.Minute*5)
		c.Set("user", u)
		c.Next()
	}
}
func (a *api) require(obj, act string) gin.HandlerFunc {
	return func(c *gin.Context) {
		u := a.current(c)
		if !a.d.Perm.Allow(u.Role, obj, act) {
			a.d.Logger.Warn("permission denied", slog.String("user", u.Username), slog.String("obj", obj), slog.String("act", act))
			c.AbortWithStatusJSON(403, gin.H{"error": "permission denied"})
			return
		}
		c.Next()
	}
}
func (a *api) agentAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			unauth(c)
			return
		}
		tok := strings.TrimPrefix(h, "Bearer ")
		if tok == "" {
			unauth(c)
			return
		}
		tokenHash := auth.HashToken(tok, a.d.Config.AgentTokenSecret)
		agentID, err := a.d.Store.GetAgentTokenIDByHash(reqctx(c), tokenHash)
		if err != nil {
			unauth(c)
			return
		}
		c.Set("agentID", agentID)
		c.Next()
	}
}
func unauth(c *gin.Context)                 { c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"}) }
func reqctx(c *gin.Context) context.Context { return c.Request.Context() }
func actor(c *gin.Context) string {
	if u, ok := c.Get("user"); ok {
		return u.(domain.User).ID
	}
	if a, ok := c.Get("agentID"); ok {
		return a.(string)
	}
	return "system"
}
func bad(c *gin.Context, err error) {
	code := 400
	if errors.Is(err, store.ErrNotFound) {
		code = 404
	}
	if errors.Is(err, store.ErrCommitRequired) {
		code = 409
	}
	if errors.Is(err, store.ErrLocked) {
		code = 409
	}
	c.JSON(code, gin.H{"error": err.Error()})
}

func (a *api) login(c *gin.Context) {
	var in struct{ Username, Password string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	u, err := a.d.Store.GetUserByUsername(reqctx(c), in.Username)
	if err != nil || !auth.VerifyPassword(in.Password, u.PasswordHash, a.d.Config.SessionSecret) {
		a.d.Logger.Warn("login failed", slog.String("username", in.Username))
		c.JSON(401, gin.H{"error": "invalid credentials"})
		return
	}
	tok, err := auth.CreateSession(reqctx(c), a.d.Store, u.ID, a.d.Config.SessionTTL, a.d.Config.SessionSecret)
	if err != nil {
		bad(c, err)
		return
	}
	a.d.Logger.Info("login success", slog.String("username", u.Username))
	c.SetCookie("ak_session", tok, int(a.d.Config.SessionTTL.Seconds()), "/", "", false, true)
	c.JSON(200, gin.H{"user": u})
}
func (a *api) logout(c *gin.Context) {
	tok, _ := c.Cookie("ak_session")
	h := auth.HashToken(tok, a.d.Config.SessionSecret)
	_ = a.d.Store.DeleteSession(reqctx(c), h)
	a.d.Cache.Del("session:" + h)
	c.SetCookie("ak_session", "", -1, "/", "", false, true)
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) me(c *gin.Context) { c.JSON(200, gin.H{"user": a.current(c)}) }
func (a *api) projects(c *gin.Context) {
	xs, err := a.d.Store.ListProjects(reqctx(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) createProject(c *gin.Context) {
	var in struct{ Name, Description string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	p, err := a.d.Store.CreateProject(reqctx(c), in.Name, in.Description, actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(201, p)
}
func (a *api) project(c *gin.Context) {
	p, err := a.d.Store.GetProject(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, p)
}
func (a *api) updateProject(c *gin.Context) {
	var in struct{ Name, Description string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.UpdateProject(reqctx(c), c.Param("projectID"), in.Name, in.Description, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) deleteProject(c *gin.Context) {
	if err := a.d.Store.DeleteProject(reqctx(c), c.Param("projectID"), actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) board(c *gin.Context) {
	xs, err := a.d.Store.Board(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) tasks(c *gin.Context) {
	xs, err := a.d.Store.ListTasks(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) createTask(c *gin.Context) {
	var in domain.Task
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	in.ProjectID = c.Param("projectID")
	t, err := a.d.Store.CreateTask(reqctx(c), in, actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(201, t)
}
func (a *api) task(c *gin.Context) {
	t, err := a.d.Store.GetTask(reqctx(c), c.Param("taskID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, t)
}
func (a *api) updateTask(c *gin.Context) {
	var in domain.Task
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	in.ID = c.Param("taskID")
	if err := a.d.Store.UpdateTask(reqctx(c), in, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) deleteTask(c *gin.Context) {
	if err := a.d.Store.DeleteTask(reqctx(c), c.Param("taskID"), actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) transitionTask(c *gin.Context) {
	var in struct{ StageKey, Status, Reason string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.TransitionTask(reqctx(c), c.Param("taskID"), in.StageKey, in.Status, actor(c), in.Reason); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) lockTask(v bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := a.d.Store.LockTask(reqctx(c), c.Param("taskID"), v, actor(c)); err != nil {
			bad(c, err)
			return
		}
		c.JSON(200, gin.H{"ok": true})
	}
}
func (a *api) approveTask(c *gin.Context) {
	var in struct{ Decision, Note string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.ApproveTask(reqctx(c), c.Param("taskID"), actor(c), in.Decision, in.Note); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) repositories(c *gin.Context) {
	xs, err := a.d.Store.ListRepositories(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) createRepository(c *gin.Context) {
	var in domain.Repository
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	in.ProjectID = c.Param("projectID")
	r, err := a.d.Store.CreateRepository(reqctx(c), in, actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(201, gin.H{"repository": r, "webhook_url": fmt.Sprintf("%s/api/webhooks/%s/%s", a.d.Config.WebhookBaseURL, r.ID, r.WebhookSecret)})
}
func (a *api) updateRepository(c *gin.Context) {
	var in domain.Repository
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	in.ID = c.Param("repoID")
	if err := a.d.Store.UpdateRepository(reqctx(c), in, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) deleteRepository(c *gin.Context) {
	if err := a.d.Store.DeleteRepository(reqctx(c), c.Param("repoID"), actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) commits(c *gin.Context) {
	xs, err := a.d.Store.ListCommits(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) linkCommit(c *gin.Context) {
	var in struct{ CommitID string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.LinkCommit(reqctx(c), c.Param("taskID"), in.CommitID, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) unlinkCommit(c *gin.Context) {
	if err := a.d.Store.UnlinkCommit(reqctx(c), c.Param("taskID"), c.Param("commitID"), actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) review(c *gin.Context) {
	var in struct{ Verdict, Note string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.CreateReview(reqctx(c), c.Param("taskID"), in.Verdict, in.Note, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) testRecord(c *gin.Context) {
	var in struct{ Verdict, Note string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	defect, err := a.d.Store.CreateTestRecord(reqctx(c), c.Param("taskID"), in.Verdict, in.Note, actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true, "defect_task_id": defect})
}
func (a *api) archive(c *gin.Context) {
	var in struct{ Content string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	ar, err := a.d.Store.CreateArchive(reqctx(c), c.Param("taskID"), in.Content, actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(201, ar)
}
func (a *api) archives(c *gin.Context) {
	xs, err := a.d.Store.ListArchives(reqctx(c), c.Param("projectID"))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) archiveRef(c *gin.Context) {
	var in struct{ ArchiveID string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.AddArchiveRef(reqctx(c), c.Param("taskID"), in.ArchiveID, actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}

func (a *api) agentTokens(c *gin.Context) {
	xs, err := a.d.Store.ListAgentTokens(reqctx(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) createAgentToken(c *gin.Context) {
	var in struct{ Name string }
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	raw := auth.NewOpaqueToken()
	id, err := a.d.Store.CreateAgentToken(reqctx(c), in.Name, auth.HashToken(raw, a.d.Config.AgentTokenSecret), actor(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(201, gin.H{"id": id, "name": in.Name, "token": raw})
}

func (a *api) webhook(c *gin.Context) {
	repo, err := a.d.Store.GetRepository(reqctx(c), c.Param("repoID"))
	if err != nil {
		bad(c, err)
		return
	}
	if !repo.WebhookEnabled {
		c.JSON(409, gin.H{"error": "webhook disabled"})
		return
	}
	if subtle.ConstantTimeCompare([]byte(repo.WebhookSecret), []byte(c.Param("secret"))) != 1 {
		c.JSON(401, gin.H{"error": "invalid webhook secret"})
		return
	}
	var body struct {
		Ref     string `json:"ref"`
		After   string `json:"after"`
		Commits []struct {
			ID, Message string
			Timestamp   string
			Author      struct{ Name string }
		} `json:"commits"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	branch := strings.TrimPrefix(body.Ref, "refs/heads/")
	var commits []domain.Commit
	for _, x := range body.Commits {
		commits = append(commits, domain.Commit{SHA: x.ID, Message: x.Message, Author: x.Author.Name, Branch: branch, CommittedAt: x.Timestamp})
	}
	if err := a.d.Store.SaveWebhookEventAndCommits(reqctx(c), repo, c.GetHeader("X-Gitlab-Event-UUID"), body, commits); err != nil {
		bad(c, err)
		return
	}
	a.d.Logger.Info("webhook processed", slog.String("repo", repo.ID), slog.Int("commits", len(commits)))
	c.JSON(200, gin.H{"ok": true, "commits": len(commits)})
}
func (a *api) agentTasks(c *gin.Context) {
	xs, err := a.d.Store.ListAgentReadyTasks(reqctx(c))
	if err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, xs)
}
func (a *api) agentClaim(c *gin.Context) {
	if err := a.d.Store.ClaimTask(reqctx(c), c.Param("taskID"), actor(c)); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
func (a *api) agentSubmit(c *gin.Context) {
	var in struct {
		Result    string
		CommitIDs []string
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		bad(c, err)
		return
	}
	if err := a.d.Store.SubmitTask(reqctx(c), c.Param("taskID"), actor(c), in.Result, in.CommitIDs); err != nil {
		bad(c, err)
		return
	}
	c.JSON(200, gin.H{"ok": true})
}
