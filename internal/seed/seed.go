package seed

import (
	"context"
	"database/sql"
	"fmt"

	"agentic-kanban/internal/auth"
	"agentic-kanban/internal/domain"
)

const seededAt = "2026-05-31T00:00:00Z"

type Summary struct {
	Created int
	Skipped int
}

type inserter struct {
	ctx     context.Context
	tx      *sql.Tx
	summary Summary
}

func Run(ctx context.Context, database *sql.DB, sessionSecret string) (Summary, error) {
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return Summary{}, fmt.Errorf("begin seed transaction: %w", err)
	}

	in := &inserter{ctx: ctx, tx: tx}
	if err := in.insertFixtures(sessionSecret); err != nil {
		_ = tx.Rollback()
		return Summary{}, err
	}
	if err := tx.Commit(); err != nil {
		return Summary{}, fmt.Errorf("commit seed transaction: %w", err)
	}
	return in.summary, nil
}

func (in *inserter) insertFixtures(sessionSecret string) error {
	for _, user := range []struct {
		id, username, password, role string
	}{
		{"seed_usr_admin", "admin", "admin123", domain.RoleAdmin},
		{"seed_usr_manager", "manager", "manager123", domain.RoleManager},
		{"seed_usr_developer", "developer", "developer123", domain.RoleDeveloper},
	} {
		if err := in.insert("user "+user.username,
			`INSERT OR IGNORE INTO users(id,username,password_hash,role,created_at) VALUES(?,?,?,?,?)`,
			user.id, user.username, auth.HashPassword(user.password, sessionSecret), user.role, seededAt); err != nil {
			return err
		}
	}

	for _, project := range []struct {
		id, boardID, name, description string
	}{
		{"seed_prj_delivery", "seed_brd_delivery", "[Demo] AgenticKanban Delivery", "完整流程演示项目，覆盖看板、代码审核、测试验收和任务引用。"},
		{"seed_prj_portal", "seed_brd_portal", "[Demo] Internal Portal", "用于项目列表和项目切换测试的辅助演示项目。"},
	} {
		if err := in.insert("project "+project.id,
			`INSERT OR IGNORE INTO projects(id,name,description,created_at,updated_at) VALUES(?,?,?,?,?)`,
			project.id, project.name, project.description, seededAt, seededAt); err != nil {
			return err
		}
		if err := in.insert("board "+project.boardID,
			`INSERT OR IGNORE INTO boards(id,project_id,name,created_at) VALUES(?,?,?,?)`,
			project.boardID, project.id, "AgenticKanban", seededAt); err != nil {
			return err
		}
		for _, stage := range domain.DefaultStages() {
			if err := in.insert("stage "+project.id+"/"+stage.Key,
				`INSERT OR IGNORE INTO board_stages(project_id,stage_key,name,position) VALUES(?,?,?,?)`,
				project.id, stage.Key, stage.Name, stage.Position); err != nil {
				return err
			}
		}
	}

	for _, task := range demoTasks() {
		if err := in.insert("task "+task.id,
			`INSERT OR IGNORE INTO tasks(id,project_id,parent_id,title,description,stage_key,status,agent_ready,locked,completed,agent_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
			task.id, task.projectID, nullable(task.parentID), task.title, task.description, task.stage, task.status, task.agentReady, task.locked, task.completed, nullable(task.agentID), task.createdBy, seededAt, seededAt); err != nil {
			return err
		}
	}

	if err := in.insert("repository seed_repo_delivery",
		`INSERT OR IGNORE INTO repositories(id,project_id,name,git_url,webhook_secret,webhook_enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`,
		"seed_repo_delivery", "seed_prj_delivery", "agentic-kanban", "https://example.com/demo/agentic-kanban.git", "seed_webhook_secret", true, seededAt, seededAt); err != nil {
		return err
	}
	if err := in.insert("webhook event seed_wev_delivery",
		`INSERT OR IGNORE INTO webhook_events(id,repository_id,event_id,payload_hash,status,message,created_at) VALUES(?,?,?,?,?,?,?)`,
		"seed_wev_delivery", "seed_repo_delivery", "seed-push-001", "seed_payload_hash", "processed", "demo webhook event", seededAt); err != nil {
		return err
	}

	for _, commit := range []struct {
		id, sha, message, author, branch string
	}{
		{"seed_cmt_board", "1111111111111111111111111111111111111111", "feat: add kanban board interactions", "developer", "feat/board-interactions"},
		{"seed_cmt_auth", "2222222222222222222222222222222222222222", "fix: tighten session validation", "developer", "fix/session-validation"},
	} {
		if err := in.insert("commit "+commit.id,
			`INSERT OR IGNORE INTO commits(id,project_id,repository_id,sha,message,author,branch,committed_at,raw_payload,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
			commit.id, "seed_prj_delivery", "seed_repo_delivery", commit.sha, commit.message, commit.author, commit.branch, seededAt, "{}", seededAt); err != nil {
			return err
		}
	}

	for _, link := range []struct{ taskID, commitID string }{
		{"seed_tsk_review", "seed_cmt_board"},
		{"seed_tsk_test", "seed_cmt_auth"},
		{"seed_tsk_completed", "seed_cmt_board"},
	} {
		if err := in.insert("task commit "+link.taskID+"/"+link.commitID,
			`INSERT OR IGNORE INTO task_commits(task_id,commit_id,linked_by,created_at) VALUES(?,?,?,?)`,
			link.taskID, link.commitID, "manager", seededAt); err != nil {
			return err
		}
	}

	for _, record := range []struct {
		label string
		query string
		args  []any
	}{
		{"approval seed_app_review", `INSERT OR IGNORE INTO approvals(id,task_id,decision,note,approver_id,created_at) VALUES(?,?,?,?,?,?)`,
			[]any{"seed_app_review", "seed_tsk_review", domain.ReviewApproved, "人工确认开发结果，可以进入代码审核。", "manager", seededAt}},
		{"review seed_rev_test", `INSERT OR IGNORE INTO reviews(id,task_id,verdict,note,reviewer_id,created_at) VALUES(?,?,?,?,?,?)`,
			[]any{"seed_rev_test", "seed_tsk_test", domain.ReviewApproved, "实现符合预期，可以进入测试。", "manager", seededAt}},
		{"task ref seed_tsk_reference", `INSERT OR IGNORE INTO task_refs(task_id,referenced_task_id,created_by,created_at) VALUES(?,?,?,?)`,
			[]any{"seed_tsk_reference", "seed_tsk_completed", "manager", seededAt}},
	} {
		if err := in.insert(record.label, record.query, record.args...); err != nil {
			return err
		}
	}

	for _, task := range demoTasks() {
		if err := in.insert("task history "+task.id,
			`INSERT OR IGNORE INTO task_histories(id,task_id,from_stage,from_status,to_stage,to_status,actor,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
			"seed_his_"+task.id, task.id, "", "", task.stage, task.status, task.createdBy, "seed demo task", seededAt); err != nil {
			return err
		}
	}
	for _, audit := range []struct{ id, action, targetType, targetID, message string }{
		{"seed_log_delivery", "project.create", "project", "seed_prj_delivery", "[Demo] AgenticKanban Delivery"},
		{"seed_log_portal", "project.create", "project", "seed_prj_portal", "[Demo] Internal Portal"},
		{"seed_log_complete", "task.complete", "task", "seed_tsk_completed", ""},
	} {
		if err := in.insert("audit log "+audit.id,
			`INSERT OR IGNORE INTO audit_logs(id,actor,action,target_type,target_id,message,created_at) VALUES(?,?,?,?,?,?,?)`,
			audit.id, "manager", audit.action, audit.targetType, audit.targetID, audit.message, seededAt); err != nil {
			return err
		}
	}
	return nil
}

func (in *inserter) insert(label, query string, args ...any) error {
	result, err := in.tx.ExecContext(in.ctx, query, args...)
	if err != nil {
		return fmt.Errorf("insert %s: %w", label, err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("count inserted %s: %w", label, err)
	}
	if n == 0 {
		in.summary.Skipped++
	} else {
		in.summary.Created += int(n)
	}
	return nil
}

type taskFixture struct {
	id, projectID, parentID, title, description, stage, status, agentID, createdBy string
	agentReady, locked, completed                                                  bool
}

func demoTasks() []taskFixture {
	return []taskFixture{
		{"seed_tsk_requirements", "seed_prj_delivery", "", "[Demo] 梳理通知中心需求", "需求澄清阶段示例任务。", domain.StageRequirementClarification, domain.StatusNotReady, "", "manager", false, false, false},
		{"seed_tsk_breakdown", "seed_prj_delivery", "", "[Demo] 拆解权限管理模块", "技术拆解阶段示例任务。", domain.StageTechnicalBreakdown, domain.StatusAgenticReady, "", "manager", true, false, false},
		{"seed_tsk_review", "seed_prj_delivery", "", "[Demo] 增加看板拖拽交互", "代码审核阶段示例任务。", domain.StageCodeReview, domain.StatusAgenticReady, "", "manager", true, false, false},
		{"seed_tsk_test", "seed_prj_delivery", "", "[Demo] 加强 Session 校验", "测试验收阶段示例任务。", domain.StageTestAcceptance, domain.StatusAgenticReady, "", "manager", true, false, false},
		{"seed_tsk_completed", "seed_prj_delivery", "", "[Demo] 优化登录流程", "已经人工确认完成的示例任务。", domain.StageTestAcceptance, domain.StatusNotReady, "", "manager", false, false, true},
		{"seed_tsk_reference", "seed_prj_delivery", "", "[Demo] 复用登录流程任务", "引用历史任务的示例任务。", domain.StageRequirementClarification, domain.StatusNotReady, "", "manager", false, false, false},
		{"seed_tsk_portal", "seed_prj_portal", "", "[Demo] 规划内部门户导航", "辅助演示项目中的示例任务。", domain.StageRequirementClarification, domain.StatusNotReady, "", "manager", false, false, false},
	}
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}
