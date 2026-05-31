package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"agentic-kanban/internal/domain"
	"agentic-kanban/internal/utils"
)

var ErrNotFound = errors.New("not found")
var ErrInvalidTransition = errors.New("invalid transition")
var ErrLocked = errors.New("task locked")
var ErrCommitRequired = errors.New("commit required before code review")
var ErrInvalidReference = errors.New("invalid task reference")

type Store struct {
	db  *sql.DB
	log *slog.Logger
}

func New(db *sql.DB, log *slog.Logger) *Store { return &Store{db: db, log: log} }

func (s *Store) DB() *sql.DB { return s.db }

func (s *Store) CreateUser(ctx context.Context, u domain.User) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO users(id,username,password_hash,role) VALUES(?,?,?,?)`, u.ID, u.Username, u.PasswordHash, u.Role)
	return err
}
func (s *Store) GetUserByUsername(ctx context.Context, username string) (domain.User, error) {
	var u domain.User
	err := s.db.QueryRowContext(ctx, `SELECT id,username,password_hash,role,created_at FROM users WHERE username=?`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	return u, one(err)
}
func (s *Store) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	var u domain.User
	err := s.db.QueryRowContext(ctx, `SELECT id,username,password_hash,role,created_at FROM users WHERE id=?`, id).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	return u, one(err)
}
func (s *Store) CreateSession(ctx context.Context, se domain.Session) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)`, se.ID, se.UserID, se.ExpiresAt)
	return err
}
func (s *Store) DeleteSession(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE id=?`, id)
	return err
}
func (s *Store) GetSessionUser(ctx context.Context, sessionID string) (domain.User, error) {
	var u domain.User
	var expiresAt string
	err := s.db.QueryRowContext(ctx, `SELECT u.id,u.username,u.password_hash,u.role,u.created_at,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?`, sessionID).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt, &expiresAt)
	if err != nil {
		return u, one(err)
	}
	exp, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil || time.Now().After(exp) {
		return u, ErrNotFound
	}
	return u, nil
}

func (s *Store) CreateProject(ctx context.Context, name, desc, actor string) (domain.Project, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Project{}, err
	}
	p := domain.Project{ID: utils.NewID("prj"), Name: name, Description: desc}
	if _, err = tx.ExecContext(ctx, `INSERT INTO projects(id,name,description) VALUES(?,?,?)`, p.ID, p.Name, p.Description); err != nil {
		_ = tx.Rollback()
		return p, err
	}
	boardID := utils.NewID("brd")
	if _, err = tx.ExecContext(ctx, `INSERT INTO boards(id,project_id,name) VALUES(?,?,?)`, boardID, p.ID, "AgenticKanban"); err != nil {
		_ = tx.Rollback()
		return p, err
	}
	for _, st := range domain.DefaultStages() {
		if _, err = tx.ExecContext(ctx, `INSERT INTO board_stages(project_id,stage_key,name,position) VALUES(?,?,?,?)`, p.ID, st.Key, st.Name, st.Position); err != nil {
			_ = tx.Rollback()
			return p, err
		}
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO audit_logs(id,actor,action,target_type,target_id,message) VALUES(?,?,?,?,?,?)`, utils.NewID("log"), actor, "project.create", "project", p.ID, p.Name); err != nil {
		_ = tx.Rollback()
		return p, err
	}
	return p, tx.Commit()
}
func (s *Store) ListProjects(ctx context.Context) ([]domain.Project, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,description,created_at,updated_at FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
func (s *Store) GetProject(ctx context.Context, id string) (domain.Project, error) {
	var p domain.Project
	err := s.db.QueryRowContext(ctx, `SELECT id,name,description,created_at,updated_at FROM projects WHERE id=? AND deleted_at IS NULL`, id).Scan(&p.ID, &p.Name, &p.Description, &p.CreatedAt, &p.UpdatedAt)
	return p, one(err)
}
func (s *Store) UpdateProject(ctx context.Context, id, name, desc, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE projects SET name=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, name, desc, id)
	if err == nil {
		s.audit(ctx, actor, "project.update", "project", id, name)
	}
	return err
}
func (s *Store) DeleteProject(ctx context.Context, id, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE projects SET deleted_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	if err == nil {
		s.audit(ctx, actor, "project.delete", "project", id, "")
	}
	return err
}
func (s *Store) Board(ctx context.Context, projectID string) ([]domain.Stage, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT stage_key,name,position FROM board_stages WHERE project_id=? ORDER BY position`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Stage
	for rows.Next() {
		var st domain.Stage
		if err := rows.Scan(&st.Key, &st.Name, &st.Position); err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, rows.Err()
}

func (s *Store) CreateTask(ctx context.Context, t domain.Task, actor string) (domain.Task, error) {
	if t.ID == "" {
		t.ID = utils.NewID("tsk")
	}
	if t.StageKey == "" {
		t.StageKey = domain.StageRequirementClarification
	}
	if t.Status == "" {
		t.Status = domain.StatusNotReady
	}
	t.AgentReady = t.Status == domain.StatusAgenticReady
	_, err := s.db.ExecContext(ctx, `INSERT INTO tasks(id,project_id,parent_id,title,description,stage_key,status,agent_ready,locked,completed,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, t.ID, t.ProjectID, nullable(t.ParentID), t.Title, t.Description, t.StageKey, t.Status, t.AgentReady, t.Locked, t.Completed, actor)
	if err == nil {
		s.hist(ctx, t.ID, "", "", t.StageKey, t.Status, actor, "create task")
		s.audit(ctx, actor, "task.create", "task", t.ID, t.Title)
	}
	return t, err
}
func (s *Store) ListTasks(ctx context.Context, projectID string) ([]domain.Task, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,project_id,COALESCE(parent_id,''),title,description,stage_key,status,agent_ready,locked,completed,COALESCE(agent_id,''),created_by,created_at,updated_at FROM tasks WHERE project_id=? AND deleted_at IS NULL ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTasks(rows)
}
func (s *Store) ListAgentReadyTasks(ctx context.Context) ([]domain.Task, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,project_id,COALESCE(parent_id,''),title,description,stage_key,status,agent_ready,locked,completed,COALESCE(agent_id,''),created_by,created_at,updated_at FROM tasks WHERE agent_ready=1 AND locked=0 AND completed=0 AND status=? AND deleted_at IS NULL ORDER BY created_at`, domain.StatusAgenticReady)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTasks(rows)
}
func (s *Store) GetTask(ctx context.Context, id string) (domain.Task, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,project_id,COALESCE(parent_id,''),title,description,stage_key,status,agent_ready,locked,completed,COALESCE(agent_id,''),created_by,created_at,updated_at FROM tasks WHERE id=? AND deleted_at IS NULL`, id)
	if err != nil {
		return domain.Task{}, err
	}
	defer rows.Close()
	ts, err := scanTasks(rows)
	if err != nil {
		return domain.Task{}, err
	}
	if len(ts) == 0 {
		return domain.Task{}, ErrNotFound
	}
	return ts[0], nil
}
func (s *Store) UpdateTask(ctx context.Context, t domain.Task, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE tasks SET title=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, t.Title, t.Description, t.ID)
	if err == nil {
		s.audit(ctx, actor, "task.update", "task", t.ID, t.Title)
	}
	return err
}
func (s *Store) DeleteTask(ctx context.Context, id, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE tasks SET deleted_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	if err == nil {
		s.audit(ctx, actor, "task.delete", "task", id, "")
	}
	return err
}
func (s *Store) LockTask(ctx context.Context, id string, locked bool, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE tasks SET locked=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, locked, id)
	if err == nil {
		s.audit(ctx, actor, "task.lock", "task", id, fmt.Sprint(locked))
	}
	return err
}

func (s *Store) TransitionTask(ctx context.Context, id, toStage, toStatus, actor, reason string) error {
	t, err := s.GetTask(ctx, id)
	if err != nil {
		return err
	}
	if t.Locked {
		return ErrLocked
	}
	if !domain.IsDefaultStage(toStage) {
		return ErrInvalidTransition
	}
	if toStage == domain.StageCodeReview {
		n, err := s.CountTaskCommits(ctx, id)
		if err != nil {
			return err
		}
		if n == 0 {
			return ErrCommitRequired
		}
	}
	agentReady := toStatus == domain.StatusAgenticReady
	_, err = s.db.ExecContext(ctx, `UPDATE tasks SET stage_key=?,status=?,agent_ready=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, toStage, toStatus, agentReady, id)
	if err == nil {
		s.hist(ctx, id, t.StageKey, t.Status, toStage, toStatus, actor, reason)
		s.audit(ctx, actor, "task.transition", "task", id, fmt.Sprintf("%s/%s -> %s/%s", t.StageKey, t.Status, toStage, toStatus))
	}
	return err
}
func (s *Store) ClaimTask(ctx context.Context, id, agentID string) error {
	t, err := s.GetTask(ctx, id)
	if err != nil {
		return err
	}
	if t.Locked {
		return ErrLocked
	}
	if !t.AgentReady || t.Status != domain.StatusAgenticReady {
		return ErrInvalidTransition
	}
	_, err = s.db.ExecContext(ctx, `UPDATE tasks SET status=?,agent_ready=0,agent_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, domain.StatusInProgress, agentID, id)
	if err == nil {
		s.hist(ctx, id, t.StageKey, t.Status, t.StageKey, domain.StatusInProgress, agentID, "agent claim")
		s.audit(ctx, agentID, "agent.claim", "task", id, "")
	}
	return err
}
func (s *Store) SubmitTask(ctx context.Context, id, agentID, result string, commitIDs []string) error {
	t, err := s.GetTask(ctx, id)
	if err != nil {
		return err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO agent_runs(id,task_id,agent_id,status,result) VALUES(?,?,?,?,?)`, utils.NewID("run"), id, agentID, "submitted", result); err != nil {
		_ = tx.Rollback()
		return err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE tasks SET status=?,agent_ready=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`, domain.StatusPendingConfirmation, id); err != nil {
		_ = tx.Rollback()
		return err
	}
	for _, cid := range commitIDs {
		if strings.TrimSpace(cid) == "" {
			continue
		}
		_, _ = tx.ExecContext(ctx, `INSERT OR IGNORE INTO task_commits(task_id,commit_id,linked_by) VALUES(?,?,?)`, id, cid, agentID)
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO task_histories(id,task_id,from_stage,from_status,to_stage,to_status,actor,reason) VALUES(?,?,?,?,?,?,?,?)`, utils.NewID("his"), id, t.StageKey, t.Status, t.StageKey, domain.StatusPendingConfirmation, agentID, "agent submit"); err != nil {
		_ = tx.Rollback()
		return err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO audit_logs(id,actor,action,target_type,target_id,message) VALUES(?,?,?,?,?,?)`, utils.NewID("log"), agentID, "agent.submit", "task", id, result); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
func (s *Store) ApproveTask(ctx context.Context, id, actor, decision, note string) error {
	t, err := s.GetTask(ctx, id)
	if err != nil {
		return err
	}
	toStage, toStatus := t.StageKey, domain.StatusAgenticReady
	if decision == "approved" {
		toStatus = domain.StatusAgenticReady
		if t.StageKey == domain.StageTechnicalBreakdown {
			toStage = domain.StageCodeReview
		}
	}
	if decision == "rejected" {
		toStatus = domain.StatusNeedsChanges
	}
	_, err = s.db.ExecContext(ctx, `INSERT INTO approvals(id,task_id,decision,note,approver_id) VALUES(?,?,?,?,?)`, utils.NewID("app"), id, decision, note, actor)
	if err != nil {
		return err
	}
	return s.TransitionTask(ctx, id, toStage, toStatus, actor, "approval: "+decision)
}

func (s *Store) CreateAgentToken(ctx context.Context, name, tokenHash, actor string) (id string, err error) {
	id = utils.NewID("agt")
	_, err = s.db.ExecContext(ctx, `INSERT INTO agent_tokens(id,name,token_hash,created_by) VALUES(?,?,?,?)`, id, name, tokenHash, actor)
	if err == nil {
		s.audit(ctx, actor, "agent_token.create", "agent_token", id, name)
	}
	return id, err
}
func (s *Store) GetAgentTokenIDByHash(ctx context.Context, tokenHash string) (string, error) {
	var id string
	err := s.db.QueryRowContext(ctx, `SELECT id FROM agent_tokens WHERE token_hash=? AND enabled=1`, tokenHash).Scan(&id)
	return id, one(err)
}
func (s *Store) ListAgentTokens(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,enabled,created_by,created_at FROM agent_tokens ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, name, createdBy, createdAt string
		var enabled bool
		if err := rows.Scan(&id, &name, &enabled, &createdBy, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"id": id, "name": name, "enabled": enabled, "created_by": createdBy, "created_at": createdAt})
	}
	return out, rows.Err()
}

func (s *Store) CreateRepository(ctx context.Context, r domain.Repository, actor string) (domain.Repository, error) {
	if r.ID == "" {
		r.ID = utils.NewID("repo")
	}
	if r.WebhookSecret == "" {
		r.WebhookSecret = utils.NewID("whsec")
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO repositories(id,project_id,name,git_url,webhook_secret,webhook_enabled) VALUES(?,?,?,?,?,?)`, r.ID, r.ProjectID, r.Name, r.GitURL, r.WebhookSecret, r.WebhookEnabled)
	if err == nil {
		s.audit(ctx, actor, "repository.create", "repository", r.ID, r.Name)
	}
	return r, err
}
func (s *Store) ListRepositories(ctx context.Context, projectID string) ([]domain.Repository, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,project_id,name,git_url,webhook_secret,webhook_enabled,created_at,updated_at FROM repositories WHERE project_id=? AND deleted_at IS NULL`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Repository
	for rows.Next() {
		var r domain.Repository
		if err := rows.Scan(&r.ID, &r.ProjectID, &r.Name, &r.GitURL, &r.WebhookSecret, &r.WebhookEnabled, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
func (s *Store) GetRepository(ctx context.Context, id string) (domain.Repository, error) {
	var r domain.Repository
	err := s.db.QueryRowContext(ctx, `SELECT id,project_id,name,git_url,webhook_secret,webhook_enabled,created_at,updated_at FROM repositories WHERE id=? AND deleted_at IS NULL`, id).Scan(&r.ID, &r.ProjectID, &r.Name, &r.GitURL, &r.WebhookSecret, &r.WebhookEnabled, &r.CreatedAt, &r.UpdatedAt)
	return r, one(err)
}
func (s *Store) UpdateRepository(ctx context.Context, r domain.Repository, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE repositories SET name=?,git_url=?,webhook_enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, r.Name, r.GitURL, r.WebhookEnabled, r.ID)
	if err == nil {
		s.audit(ctx, actor, "repository.update", "repository", r.ID, r.Name)
	}
	return err
}
func (s *Store) DeleteRepository(ctx context.Context, id, actor string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE repositories SET deleted_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	if err == nil {
		s.audit(ctx, actor, "repository.delete", "repository", id, "")
	}
	return err
}

func (s *Store) SaveWebhookEventAndCommits(ctx context.Context, repo domain.Repository, eventID string, payload any, commits []domain.Commit) error {
	b, _ := json.Marshal(payload)
	payloadHash := fmt.Sprintf("%x", b)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if eventID != "" {
		if _, err = tx.ExecContext(ctx, `INSERT OR IGNORE INTO webhook_events(id,repository_id,event_id,payload_hash,status,message) VALUES(?,?,?,?,?,?)`, utils.NewID("wev"), repo.ID, eventID, payloadHash, "received", ""); err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	for _, c := range commits {
		if c.ID == "" {
			c.ID = utils.NewID("cmt")
		}
		if c.ProjectID == "" {
			c.ProjectID = repo.ProjectID
		}
		c.RepositoryID = repo.ID
		if c.CommittedAt == "" {
			c.CommittedAt = time.Now().UTC().Format(time.RFC3339)
		}
		_, err = tx.ExecContext(ctx, `INSERT OR IGNORE INTO commits(id,project_id,repository_id,sha,message,author,branch,committed_at,raw_payload) VALUES(?,?,?,?,?,?,?,?,?)`, c.ID, c.ProjectID, c.RepositoryID, c.SHA, c.Message, c.Author, c.Branch, c.CommittedAt, string(b))
		if err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}
func (s *Store) ListCommits(ctx context.Context, projectID string) ([]domain.Commit, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id,project_id,repository_id,sha,message,author,branch,committed_at,created_at FROM commits WHERE project_id=? ORDER BY committed_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Commit
	for rows.Next() {
		var c domain.Commit
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.RepositoryID, &c.SHA, &c.Message, &c.Author, &c.Branch, &c.CommittedAt, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
func (s *Store) LinkCommit(ctx context.Context, taskID, commitID, actor string) error {
	_, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO task_commits(task_id,commit_id,linked_by) VALUES(?,?,?)`, taskID, commitID, actor)
	if err == nil {
		s.audit(ctx, actor, "commit.link", "task", taskID, commitID)
	}
	return err
}
func (s *Store) UnlinkCommit(ctx context.Context, taskID, commitID, actor string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM task_commits WHERE task_id=? AND commit_id=?`, taskID, commitID)
	if err == nil {
		s.audit(ctx, actor, "commit.unlink", "task", taskID, commitID)
	}
	return err
}
func (s *Store) CountTaskCommits(ctx context.Context, taskID string) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM task_commits WHERE task_id=?`, taskID).Scan(&n)
	return n, err
}

func (s *Store) CreateReview(ctx context.Context, taskID, verdict, note, actor string) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO reviews(id,task_id,verdict,note,reviewer_id) VALUES(?,?,?,?,?)`, utils.NewID("rev"), taskID, verdict, note, actor)
	if err != nil {
		return err
	}
	if verdict == domain.ReviewApproved {
		return s.TransitionTask(ctx, taskID, domain.StageTestAcceptance, domain.StatusAgenticReady, actor, "review approved")
	}
	return s.TransitionTask(ctx, taskID, domain.StageTechnicalBreakdown, domain.StatusNeedsChanges, actor, "review rejected")
}
func (s *Store) CreateTestRecord(ctx context.Context, taskID, verdict, note, actor string) (string, error) {
	_, err := s.db.ExecContext(ctx, `INSERT INTO test_records(id,task_id,verdict,note,tester_id) VALUES(?,?,?,?,?)`, utils.NewID("tst"), taskID, verdict, note, actor)
	if err != nil {
		return "", err
	}
	if verdict != domain.TestFailed {
		return "", ErrInvalidTransition
	}
	parent, err := s.GetTask(ctx, taskID)
	if err != nil {
		return "", err
	}
	defect, _ := s.CreateTask(ctx, domain.Task{ProjectID: parent.ProjectID, ParentID: taskID, Title: "缺陷修复：" + parent.Title, Description: note, StageKey: domain.StageTechnicalBreakdown, Status: domain.StatusAgenticReady}, actor)
	return defect.ID, s.TransitionTask(ctx, taskID, domain.StageTechnicalBreakdown, domain.StatusNeedsChanges, actor, "test failed")
}
func (s *Store) CompleteTask(ctx context.Context, taskID, actor string) error {
	t, err := s.GetTask(ctx, taskID)
	if err != nil {
		return err
	}
	if t.StageKey != domain.StageTestAcceptance {
		return ErrInvalidTransition
	}
	_, err = s.db.ExecContext(ctx, `UPDATE tasks SET completed=1,agent_ready=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`, taskID)
	if err == nil {
		s.audit(ctx, actor, "task.complete", "task", taskID, "")
	}
	return err
}
func (s *Store) ListTaskRefs(ctx context.Context, taskID string) ([]domain.Task, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT t.id,t.project_id,COALESCE(t.parent_id,''),t.title,t.description,t.stage_key,t.status,t.agent_ready,t.locked,t.completed,COALESCE(t.agent_id,''),t.created_by,t.created_at,t.updated_at FROM task_refs r JOIN tasks t ON t.id=r.referenced_task_id WHERE r.task_id=? AND t.deleted_at IS NULL ORDER BY r.created_at DESC`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTasks(rows)
}
func (s *Store) AddTaskRef(ctx context.Context, taskID, referencedTaskID, actor string) error {
	if taskID == referencedTaskID {
		return ErrInvalidReference
	}
	task, err := s.GetTask(ctx, taskID)
	if err != nil {
		return err
	}
	referencedTask, err := s.GetTask(ctx, referencedTaskID)
	if err != nil {
		return err
	}
	if task.ProjectID != referencedTask.ProjectID {
		return ErrInvalidReference
	}
	_, err = s.db.ExecContext(ctx, `INSERT OR IGNORE INTO task_refs(task_id,referenced_task_id,created_by) VALUES(?,?,?)`, taskID, referencedTaskID, actor)
	if err == nil {
		s.audit(ctx, actor, "task.reference", "task", taskID, referencedTaskID)
	}
	return err
}

func scanTasks(rows *sql.Rows) ([]domain.Task, error) {
	var out []domain.Task
	for rows.Next() {
		var t domain.Task
		if err := rows.Scan(&t.ID, &t.ProjectID, &t.ParentID, &t.Title, &t.Description, &t.StageKey, &t.Status, &t.AgentReady, &t.Locked, &t.Completed, &t.AgentID, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
func nullable(v string) any {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}
func one(err error) error {
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
func (s *Store) hist(ctx context.Context, taskID, fs, ft, ts, tt, actor, reason string) {
	_, _ = s.db.ExecContext(ctx, `INSERT INTO task_histories(id,task_id,from_stage,from_status,to_stage,to_status,actor,reason) VALUES(?,?,?,?,?,?,?,?)`, utils.NewID("his"), taskID, fs, ft, ts, tt, actor, reason)
}
func (s *Store) audit(ctx context.Context, actor, action, targetType, targetID, message string) {
	_, _ = s.db.ExecContext(ctx, `INSERT INTO audit_logs(id,actor,action,target_type,target_id,message) VALUES(?,?,?,?,?,?)`, utils.NewID("log"), actor, action, targetType, targetID, message)
	s.log.Info("audit", slog.String("actor", actor), slog.String("action", action), slog.String("target", targetID), slog.String("message", message))
}
