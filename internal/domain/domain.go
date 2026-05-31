package domain

const (
	RoleAdmin     = "admin"
	RoleManager   = "manager"
	RoleDeveloper = "developer"

	StageRequirementClarification = "requirement_clarification"
	StageTechnicalBreakdown       = "technical_breakdown"
	StageCodeReview               = "code_review"
	StageTestAcceptance           = "test_acceptance"

	StatusNotReady            = "not_ready"
	StatusAgenticReady        = "agentic_ready"
	StatusInProgress          = "in_progress"
	StatusPendingConfirmation = "pending_confirmation"
	StatusNeedsChanges        = "needs_changes"
	StatusReviewPassed        = "review_passed"

	ReviewApproved = "approved"
	ReviewRejected = "rejected"
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
	Completed                                                     bool
	AgentID, CreatedBy, CreatedAt, UpdatedAt                      string
}

type TaskHistory struct{ ID, TaskID, FromStage, FromStatus, ToStage, ToStatus, Actor, Reason, CreatedAt string }

type Repository struct {
	ID, ProjectID, Name, GitURL, WebhookSecret string
	WebhookEnabled                             bool
	CreatedAt, UpdatedAt                       string
}
type Commit struct{ ID, ProjectID, RepositoryID, SHA, Message, Author, Branch, CommittedAt, CreatedAt string }

func DefaultStages() []Stage {
	return []Stage{
		{StageRequirementClarification, "需求澄清", 1},
		{StageTechnicalBreakdown, "技术拆解", 2},
		{StageCodeReview, "代码审核", 3},
		{StageTestAcceptance, "测试验收", 4},
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
