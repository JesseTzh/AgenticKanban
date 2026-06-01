package domain

const (
	RoleAdmin     = "admin"
	RoleManager   = "manager"
	RoleDeveloper = "developer"

	StageRequirementClarification = "requirement_clarification"
	StageTechnicalBreakdown       = "technical_breakdown"
	StageCodeReview               = "code_review"
	StageTestAcceptance           = "test_acceptance"

	StatusNotReady           = "not_ready"
	StatusAgenticReady       = "agentic_ready"
	StatusInProgress         = "in_progress"
	StatusPendingHumanReview = "pending_human_review"
	StatusNeedRedo           = "need_redo"
	StatusReviewPassed       = "review_passed"

	AgentWorkTechnicalBreakdown = "technical_breakdown"
	AgentWorkDevelopment        = "development"
	AgentWorkCodeReview         = "code_review"

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
	AgentReady, Completed                                         bool
	AgentID, CreatedBy, CreatedAt, UpdatedAt                      string
}

type TaskHistory struct{ ID, TaskID, FromStage, FromStatus, ToStage, ToStatus, Actor, Reason, CreatedAt string }
type HumanReview struct{ ID, TaskID, AgentRunID, Decision, Note, ReviewerID, CreatedAt string }
type AgentTask struct {
	Task         Task
	HumanReviews []HumanReview
}
type AgentRun struct {
	ID, TaskID, AgentID, AgentKeyName, AgentOwnerUsername string
	WorkType, Status, Result, CreatedAt                   string
	Passed                                                *bool
}
type AgentWorkDetail struct {
	Runs         []AgentRun
	HumanReviews []HumanReview
}
type AgentTokenMetadata struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	OwnerID       string `json:"owner_id"`
	OwnerUsername string `json:"owner_username"`
	CreatedAt     string `json:"created_at"`
}

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
