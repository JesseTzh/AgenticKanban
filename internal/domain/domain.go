package domain

const (
	RoleAdmin     = "admin"
	RoleManager   = "manager"
	RoleDeveloper = "developer"

	StageRequirementClarification = "requirement_clarification"
	StageTechnicalBreakdown       = "technical_breakdown"
	StageDevelopmentExecution     = "development_execution"
	StageCodeReview               = "code_review"
	StageTestAcceptance           = "test_acceptance"
	StageDoneArchive              = "done_archive"

	StatusNotReady            = "not_ready"
	StatusAgenticReady        = "agentic_ready"
	StatusInProgress          = "in_progress"
	StatusPendingConfirmation = "pending_confirmation"
	StatusNeedsChanges        = "needs_changes"
	StatusReviewPassed        = "review_passed"
	StatusTestPassed          = "test_passed"
	StatusArchived            = "archived"

	ReviewApproved = "approved"
	ReviewRejected = "rejected"
	TestPassed     = "passed"
	TestFailed     = "failed"
)

type User struct{ ID, Username, PasswordHash, Role, CreatedAt string }
type Session struct{ ID, UserID, ExpiresAt, CreatedAt string }

type Project struct{ ID, Name, Description, CreatedAt, UpdatedAt string }
type Stage struct {
	Key, Name string
	Position  int
}

type Task struct {
	ID, ProjectID, ParentID, Title, Description, StageKey, Status string
	AgentReady                                                    bool
	Locked                                                        bool
	AgentID, CreatedBy, CreatedAt, UpdatedAt                      string
}

type TaskHistory struct{ ID, TaskID, FromStage, FromStatus, ToStage, ToStatus, Actor, Reason, CreatedAt string }

type Repository struct {
	ID, ProjectID, Name, GitURL, WebhookSecret string
	WebhookEnabled                             bool
	CreatedAt, UpdatedAt                       string
}
type Commit struct{ ID, ProjectID, RepositoryID, SHA, Message, Author, Branch, CommittedAt, CreatedAt string }
type Archive struct {
	ID, TaskID                    string
	Version                       int
	Content, CreatedBy, CreatedAt string
}

func DefaultStages() []Stage {
	return []Stage{
		{StageRequirementClarification, "需求澄清", 1},
		{StageTechnicalBreakdown, "技术拆解", 2},
		{StageDevelopmentExecution, "开发执行", 3},
		{StageCodeReview, "代码复核", 4},
		{StageTestAcceptance, "测试验收", 5},
		{StageDoneArchive, "完成归档", 6},
	}
}

func IsDefaultStage(key string) bool {
	for _, s := range DefaultStages() {
		if s.Key == key {
			return true
		}
	}
	return false
}
