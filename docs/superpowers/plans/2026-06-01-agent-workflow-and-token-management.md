# Agent Workflow and Token Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove task locking, implement the human-reviewed Agent workflow, authenticate Agent calls with user-owned keys, and add an Agent-key management page.

**Architecture:** Keep the existing task table and explicit `agent_ready` switch. Add a forward SQLite migration after the in-progress archive-removal migration, model Agent submissions as typed `agent_runs`, append human approvals as retry context, and expose stage-specific Agent submit endpoints. Reuse the existing session-authenticated React shell for a shadcn-based key-management page.

**Tech Stack:** Go, Gin, SQLite, Casbin, React, TypeScript, Vite, TanStack Query, shadcn UI, Vitest.

**Project instruction:** `AGENTS.md` explicitly says not to use TDD unless requested. Implement each scoped change first, then add focused regression coverage before committing.

---

## Existing Worktree Constraint

The worktree already contains unrelated in-progress migration work:

```text
 M migrations/001_init.sql
?? internal/db/db_test.go
?? migrations/002_remove_archive_add_task_refs.sql
```

Do not revert or overwrite these files. Read them before editing and preserve
their archive-removal behavior. Add this feature as
`migrations/003_agent_workflow_and_token_management.sql`.

## File Map

### Backend schema and domain

- Modify: `migrations/001_init.sql`
- Create: `migrations/003_agent_workflow_and_token_management.sql`
- Modify: `internal/db/db_test.go`
- Modify: `internal/domain/domain.go`
- Modify: `internal/seed/seed.go`

### Backend workflow and APIs

- Modify: `internal/store/store.go`
- Modify: `internal/store/store_test.go`
- Modify: `internal/httpapi/router.go`
- Modify: `internal/httpapi/router_test.go`
- Modify: `internal/permission/permission.go`

### Frontend

- Modify: `web/src/types.ts`
- Modify: `web/src/lib/api.ts`
- Modify: `web/src/lib/query-client.ts`
- Modify: `web/src/app/app.tsx`
- Modify: `web/src/components/layout/admin-shell.tsx`
- Create: `web/src/features/agent-keys/agent-keys-page.tsx`
- Create: `web/src/features/agent-keys/create-agent-key-dialog.tsx`
- Create: `web/src/features/agent-keys/agent-keys-page.test.tsx`
- Modify: `web/src/features/board/task-card.tsx`
- Modify: `web/src/features/board/task-detail-dialog.tsx`
- Modify: `web/src/features/board/task-detail-dialog.test.tsx`
- Create: `web/src/features/board/human-review-dialog.tsx`

### Documentation

- Modify: `README.md`
- Modify: `docs/核心设计.md`

## Task 1: Add The Forward Schema Migration And Domain Types

**Files:**

- Modify: `migrations/001_init.sql`
- Create: `migrations/003_agent_workflow_and_token_management.sql`
- Modify: `internal/db/db_test.go`
- Modify: `internal/domain/domain.go`
- Modify: `internal/seed/seed.go`

- [ ] **Step 1: Re-read the in-progress migration files before editing**

Run:

```bash
git diff -- migrations/001_init.sql
sed -n '1,220p' migrations/002_remove_archive_add_task_refs.sql
sed -n '1,180p' internal/db/db_test.go
```

Expected: the existing archive-removal migration remains intact and the new
workflow migration can be added as version `003`.

- [ ] **Step 2: Add `003_agent_workflow_and_token_management.sql`**

Create a forward migration with these operations:

```sql
DROP INDEX IF EXISTS idx_tasks_agent_ready;
ALTER TABLE tasks DROP COLUMN locked;
CREATE INDEX IF NOT EXISTS idx_tasks_agent_ready ON tasks(agent_ready, status);

UPDATE tasks SET status = 'pending_human_review' WHERE status = 'pending_confirmation';
UPDATE tasks SET status = 'need_redo', agent_ready = 0 WHERE status = 'needs_changes';

ALTER TABLE agent_runs ADD COLUMN work_type TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_runs ADD COLUMN passed INTEGER;
ALTER TABLE approvals ADD COLUMN agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL;
```

Use the SQLite-supported `DROP COLUMN` operation. If the configured SQLite
driver rejects it, rebuild `tasks` in the migration while preserving every
column except `locked`, all task rows, foreign keys, and indexes.

- [ ] **Step 3: Keep the initial schema compatible with sequential migrations**

Do not collapse the uncommitted `002` behavior into a destructive rewrite.
Ensure a fresh database that runs `001`, `002`, and `003` ends with:

```sql
tasks(..., agent_ready INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, agent_id TEXT, ...)
agent_runs(..., work_type TEXT NOT NULL DEFAULT '', passed INTEGER, ...)
approvals(..., agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL, ...)
CREATE INDEX idx_tasks_agent_ready ON tasks(agent_ready, status);
```

The final schema must not contain `tasks.locked`.

- [ ] **Step 4: Replace lock and old-status domain definitions**

Update `internal/domain/domain.go` so the relevant constants and types include:

```go
const (
	StatusPendingHumanReview = "pending_human_review"
	StatusNeedRedo           = "need_redo"

	AgentWorkTechnicalBreakdown = "technical_breakdown"
	AgentWorkDevelopment        = "development"
	AgentWorkCodeReview         = "code_review"
)

type Task struct {
	ID, ProjectID, ParentID, Title, Description, StageKey, Status string
	AgentReady, Completed                                        bool
	AgentID, CreatedBy, CreatedAt, UpdatedAt                      string
}

type HumanReview struct {
	ID, TaskID, AgentRunID, Decision, Note, ReviewerID, CreatedAt string
}

type AgentTask struct {
	Task         Task
	HumanReviews []HumanReview
}

type AgentRun struct {
	ID, TaskID, AgentID, AgentKeyName, AgentOwnerUsername string
	WorkType, Status, Result, CreatedAt                    string
	Passed                                                *bool
}

type AgentWorkDetail struct {
	Runs         []AgentRun
	HumanReviews []HumanReview
}

type AgentTokenMetadata struct {
	ID, Name, OwnerID, OwnerUsername, CreatedAt string
}
```

Remove `StatusPendingConfirmation`, `StatusNeedsChanges`, and `Task.Locked`.

- [ ] **Step 5: Update demo seed fixtures**

Remove the `locked` fixture field and SQL column from `internal/seed/seed.go`.
Keep test-acceptance demo tasks human-only by setting `agentReady` to `false`.
Update seeded status names to `pending_human_review` and `need_redo` where used.

- [ ] **Step 6: Extend migration regression coverage**

Update `internal/db/db_test.go` so the upgrade fixture inserts a locked task
with `pending_confirmation`, runs all migrations, and verifies:

```go
if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('tasks') WHERE name='locked'`).Scan(&count); err != nil {
	t.Fatal(err)
}
if count != 0 {
	t.Fatalf("locked columns=%d", count)
}
if err := database.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('agent_runs') WHERE name IN ('work_type','passed')`).Scan(&count); err != nil {
	t.Fatal(err)
}
if count != 2 {
	t.Fatalf("agent run workflow columns=%d", count)
}
```

Also assert migrated status names and the lock-free Agent-ready index.

- [ ] **Step 7: Run schema and domain verification**

Run:

```bash
go test ./internal/db ./internal/domain ./internal/seed
```

Expected: PASS.

- [ ] **Step 8: Commit the schema and domain slice**

```bash
git add migrations/001_init.sql migrations/002_remove_archive_add_task_refs.sql migrations/003_agent_workflow_and_token_management.sql internal/db/db_test.go internal/domain/domain.go internal/seed/seed.go
git commit -m "refactor(workflow): remove task locking schema"
```

## Task 2: Implement The Store-Level Agent Workflow

**Files:**

- Modify: `internal/store/store.go`
- Modify: `internal/store/store_test.go`

- [ ] **Step 1: Remove lock handling from task persistence**

Delete `ErrLocked`, `LockTask`, lock checks, lock query columns, and lock scan
targets. Keep `agent_ready=1`, `completed=0`, and `status=agentic_ready` as the
Agent queue predicate:

```go
rows, err := s.db.QueryContext(ctx, `
	SELECT id,project_id,COALESCE(parent_id,''),title,description,stage_key,status,
	       agent_ready,completed,COALESCE(agent_id,''),created_by,created_at,updated_at
	FROM tasks
	WHERE agent_ready=1 AND completed=0 AND status=?
	  AND stage_key IN (?,?,?) AND deleted_at IS NULL
	ORDER BY created_at`,
	domain.StatusAgenticReady,
	domain.StageRequirementClarification,
	domain.StageTechnicalBreakdown,
	domain.StageCodeReview,
)
```

Pass requirement clarification, technical breakdown, and code review as the
allowed stages. Test acceptance must never enter the Agent queue.

- [ ] **Step 2: Add stable workflow errors**

Define:

```go
var ErrAgentClaimMismatch = errors.New("task claimed by another agent key")
var ErrCommitSHANotFound = errors.New("commit sha not found")
```

Wrap the SHA error with the missing value:

```go
return fmt.Errorf("%w: %s", ErrCommitSHANotFound, sha)
```

- [ ] **Step 3: Keep claim exclusive and bind the Agent key**

Update `ClaimTask` to require `agent_ready` and `agentic_ready`, write
`status=in_progress`, clear `agent_ready`, and store the key ID in
`tasks.agent_id`. Reject test-acceptance claims and subsequent claims because
the task is not an allowed Agent stage or is no longer Agent-ready.

Add a shared guard:

```go
func requireClaimedTask(t domain.Task, agentID, stage string) error {
	if t.StageKey != stage || t.Status != domain.StatusInProgress {
		return ErrInvalidTransition
	}
	if t.AgentID != agentID {
		return ErrAgentClaimMismatch
	}
	return nil
}
```

- [ ] **Step 4: Replace generic submission with three typed methods**

Implement:

```go
func (s *Store) SubmitBreakdown(ctx context.Context, taskID, agentID, result string) error
func (s *Store) SubmitDevelopment(ctx context.Context, taskID, agentID, result string, commitSHAs []string) error
func (s *Store) SubmitCodeReview(ctx context.Context, taskID, agentID, result string, passed bool) error
```

Required transitions:

```text
SubmitBreakdown:
  requirement_clarification/in_progress
  -> technical_breakdown/pending_human_review

SubmitDevelopment:
  technical_breakdown/in_progress
  -> resolve every project Commit SHA atomically
  -> link task_commits atomically
  -> code_review/agentic_ready

SubmitCodeReview:
  code_review/in_progress
  -> save passed verdict and opinion
  -> code_review/pending_human_review
```

Each method inserts an `agent_runs` row with `agent_id`, `work_type`, `result`,
and nullable `passed`, writes task history, and writes an audit record in the
same transaction.

- [ ] **Step 5: Resolve development Commit SHA values atomically**

Add a transaction-local helper:

```go
func resolveProjectCommitIDs(ctx context.Context, tx *sql.Tx, projectID string, shas []string) ([]string, error)
```

Trim empty SHA values, require at least one SHA, and query:

```sql
SELECT id FROM commits WHERE project_id=? AND sha=? LIMIT 1
```

Do not create the Agent run, link partial Commits, or advance the task if any
SHA is missing.

- [ ] **Step 6: Store and return human-review history**

Update `ApproveTask` so approvals append `approvals.agent_run_id` for the latest
run and enforce:

```text
technical_breakdown/pending_human_review + approved
  -> technical_breakdown/agentic_ready

technical_breakdown/pending_human_review + rejected
  -> technical_breakdown/need_redo

code_review/pending_human_review + approved + latest run passed=true
  -> test_acceptance/not_ready

code_review/pending_human_review + approved + latest run passed=false
  -> technical_breakdown/need_redo

code_review/pending_human_review + rejected
  -> technical_breakdown/need_redo
```

Add:

```go
func (s *Store) ListHumanReviews(ctx context.Context, taskID string) ([]domain.HumanReview, error)
func (s *Store) ListAgentTasks(ctx context.Context) ([]domain.AgentTask, error)
func (s *Store) GetAgentWorkDetail(ctx context.Context, taskID string) (domain.AgentWorkDetail, error)
```

`ListAgentTasks` wraps each available task with ordered approval history.
`GetAgentWorkDetail` returns typed Agent runs and human-review history for the
browser task-detail dialog. Join Agent key metadata and owner username so
humans can see which user's Agent produced each run.

- [ ] **Step 7: Replace arbitrary human transitions with explicit Agent release**

Replace the broadly permissive `TransitionTask` browser use with:

```go
func (s *Store) MarkTaskAgentReady(ctx context.Context, taskID, actor, reason string) error
```

Allow explicit human release only for requirement clarification and technical
breakdown tasks that are not completed. Set `status=agentic_ready` and
`agent_ready=1`. Code review becomes Agent-ready only after successful
development submission. Test acceptance can never be released to Agents.

- [ ] **Step 8: Keep test acceptance human-only**

Update `CompleteTask` and `CreateTestRecord` so test-acceptance actions never
produce an Agent-ready test task. A failed test returns the same task to
`technical_breakdown/need_redo` with `agent_ready=0`; do not create a parallel
technical-breakdown child task.

Remove the old `CreateReview` Store path. Code review is now submitted by an
Agent and resolved by `ApproveTask`; keeping a second direct-review path would
bypass human confirmation.

- [ ] **Step 9: Add store regression coverage**

Replace obsolete workflow tests and add focused cases in
`internal/store/store_test.go`:

```text
TestClaimTaskBindsSingleAgentKey
TestSubmitBreakdownMovesToHumanReview
TestApproveBreakdownMakesDevelopmentAvailable
TestRejectBreakdownRequiresHumanReopen
TestSubmitDevelopmentRejectsUnknownSHAAtomically
TestSubmitDevelopmentLinksSHAAndMakesCodeReviewAvailable
TestSubmitCodeReviewWaitsForHumanReview
TestApprovePassedCodeReviewMovesToHumanTestAcceptance
TestRejectCodeReviewReturnsToNeedRedo
TestAgentTaskListIncludesOrderedHumanReviewHistory
TestAgentTaskListExcludesTestAcceptance
TestMarkTaskAgentReadyRejectsTestAcceptanceAndCodeReview
TestAgentWorkDetailIncludesRunsAndHumanReviewHistory
TestTestFailureReturnsSameTaskToNeedRedo
```

- [ ] **Step 10: Run store verification**

Run:

```bash
go test ./internal/store
```

Expected: PASS.

- [ ] **Step 11: Commit the store workflow**

```bash
git add internal/store/store.go internal/store/store_test.go
git commit -m "feat(workflow): add human-reviewed agent execution"
```

## Task 3: Expose Dedicated Agent APIs And User-Owned Key Listing

**Files:**

- Modify: `internal/httpapi/router.go`
- Modify: `internal/httpapi/router_test.go`
- Modify: `internal/permission/permission.go`

- [ ] **Step 1: Allow every signed-in user to manage their own keys**

Keep session authentication and add developer Agent-key permissions:

```go
_, _ = e.AddPolicy("developer", "agent", "read")
_, _ = e.AddPolicy("developer", "agent", "write")
```

Managers and administrators retain their existing access.

- [ ] **Step 2: Filter key metadata by requester**

Change the store listing method to:

```go
func (s *Store) ListAgentTokens(ctx context.Context, requesterID string, includeAll bool) ([]domain.AgentTokenMetadata, error)
```

Join `users` so administrator results include owner ID and username. In the
HTTP handler call it with:

```go
u := a.current(c)
xs, err := a.d.Store.ListAgentTokens(reqctx(c), u.ID, u.Role == domain.RoleAdmin)
```

Never select or return `token_hash`. Continue returning plaintext only from the
create response.

- [ ] **Step 3: Remove lock routes and the generic Agent submit route**

Delete:

```go
authn.POST("/tasks/:taskID/lock", ...)
authn.POST("/tasks/:taskID/unlock", ...)
authn.POST("/tasks/:taskID/transitions", ...)
authn.POST("/tasks/:taskID/reviews", ...)
agent.POST("/tasks/:taskID/submit", a.agentSubmit)
```

Add:

```go
authn.POST("/tasks/:taskID/agent-ready", a.markTaskAgentReady)
authn.GET("/tasks/:taskID/agent-work", a.agentWorkDetail)
agent.POST("/tasks/:taskID/submit-breakdown", a.agentSubmitBreakdown)
agent.POST("/tasks/:taskID/submit-development", a.agentSubmitDevelopment)
agent.POST("/tasks/:taskID/submit-code-review", a.agentSubmitCodeReview)
```

- [ ] **Step 4: Add typed Agent handlers**

Bind these request contracts:

```go
var breakdown struct{ Result string }
var development struct {
	Result     string
	CommitSHAs []string
}
var codeReview struct {
	Result string
	Passed bool
}
```

Each handler calls the matching Store method with `actor(c)`, which is the
authenticated Agent-key ID set by `agentAuth`.

- [ ] **Step 5: Force browser task creation to start with human clarification**

In `createTask`, overwrite workflow fields supplied by the browser before
calling the Store:

```go
in.ProjectID = c.Param("projectID")
in.StageKey = domain.StageRequirementClarification
in.Status = domain.StatusNotReady
in.AgentReady = false
```

- [ ] **Step 6: Map stable workflow errors**

Update `bad`:

```go
if errors.Is(err, store.ErrInvalidTransition) {
	code, errorCode = 409, "invalid_transition"
}
if errors.Is(err, store.ErrAgentClaimMismatch) {
	code, errorCode = 409, "agent_claim_mismatch"
}
if errors.Is(err, store.ErrCommitSHANotFound) {
	code, errorCode = 409, "commit_sha_not_found"
}
```

Remove the `locked` mapping.

- [ ] **Step 7: Add router-level regression coverage**

Add HTTP tests that:

```text
- create two browser users and keys;
- verify create responses contain plaintext exactly once;
- verify normal users list only their own metadata;
- verify administrators list all metadata without token hashes or plaintext;
- reject missing and invalid Bearer keys with unauthorized;
- claim with key A and reject claim or submit from key B;
- release requirement and retry work through /agent-ready;
- reject /agent-ready for code-review and test-acceptance tasks;
- submit breakdown through submit-breakdown;
- reject an unknown development SHA with commit_sha_not_found and the SHA in the message;
- submit a webhook Commit, submit development by SHA, and receive code_review/agentic_ready;
- submit code-review opinion and receive pending_human_review;
- return browser-visible Agent runs and human-review history from /agent-work;
- force browser-created tasks to requirement_clarification/not_ready even if
  the request body attempts to provide another stage or status;
- reject removed /lock, /unlock, /transitions, /reviews, and generic /submit
  routes with not_found.
```

- [ ] **Step 8: Run backend API verification**

Run:

```bash
go test ./internal/httpapi ./internal/permission
```

Expected: PASS.

- [ ] **Step 9: Commit the API slice**

```bash
git add internal/httpapi/router.go internal/httpapi/router_test.go internal/permission/permission.go internal/store/store.go internal/domain/domain.go
git commit -m "feat(api): add dedicated agent key workflow endpoints"
```

## Task 4: Remove Lock State From The Web UI

**Files:**

- Modify: `web/src/types.ts`
- Modify: `web/src/lib/api.ts`
- Modify: `web/src/lib/query-client.ts`
- Modify: `web/src/features/board/task-card.tsx`
- Modify: `web/src/features/board/task-detail-dialog.tsx`
- Modify: `web/src/features/board/task-detail-dialog.test.tsx`
- Create: `web/src/features/board/human-review-dialog.tsx`

- [ ] **Step 1: Remove the frontend lock field and rendering**

Change the task type:

```ts
export type Task = {
  ID:string
  ProjectID:string
  ParentID:string
  Title:string
  Description:string
  StageKey:string
  Status:string
  AgentReady:boolean
  Completed:boolean
  AgentID:string
}
```

Remove `LockKeyhole`, the `task-lock-*` badge, and the `锁定状态` detail row.

- [ ] **Step 2: Replace arbitrary move actions with workflow actions**

Add browser API helpers:

```ts
markTaskAgentReady: (taskID: string) =>
  request(`/api/tasks/${taskID}/agent-ready`, { method: 'POST' }),
agentWork: (taskID: string) =>
  request<AgentWorkDetail>(`/api/tasks/${taskID}/agent-work`),
approveTask: (taskID: string, data: { Decision:string; Note:string }) =>
  request(`/api/tasks/${taskID}/approvals`, { method: 'POST', body: JSON.stringify(data) }),
```

Remove `transitionTask` and the unconditional move-to-stage menu items. Render
only valid task-card actions:

```text
requirement_clarification or technical_breakdown and not agentic_ready/in_progress:
  开放给 Agent

technical_breakdown or code_review and pending_human_review:
  人工审核

test_acceptance and not completed:
  测试失败
  确认完成
```

Remove the old `api.review` helper. Human review uses `approveTask`; Agents use
the dedicated Bearer-token code-review submission endpoint.

- [ ] **Step 3: Show Agent results and collect human review notes**

Add `HumanReviewDialog` using shadcn `Dialog`, `Input`, and `Button`. Require a
human note and submit either:

```ts
{ Decision: 'approved', Note: note }
{ Decision: 'rejected', Note: note }
```

Update `TaskDetailDialog` to query `api.agentWork(task.ID)` while open and
render Agent run result, key name, owner username, verdict where present, and
ordered human-review notes. Add stable `data-test-id` to every new rendered
element.

- [ ] **Step 4: Update dialog regression coverage**

Remove `Locked` from fixtures and assert:

```ts
expect(screen.queryByText('锁定状态')).not.toBeInTheDocument()
expect(screen.queryByText('已锁定')).not.toBeInTheDocument()
```

Also verify Agent work detail rendering, human-note submission, and the
explicit `开放给 Agent` action.

- [ ] **Step 5: Run focused frontend verification**

Run:

```bash
cd web && npm test -- task-detail-dialog
```

Expected: PASS.

- [ ] **Step 6: Commit the task workflow UI slice**

```bash
git add web/src/types.ts web/src/lib/api.ts web/src/lib/query-client.ts web/src/features/board/task-card.tsx web/src/features/board/task-detail-dialog.tsx web/src/features/board/task-detail-dialog.test.tsx web/src/features/board/human-review-dialog.tsx
git commit -m "feat(ui): add human-reviewed agent task actions"
```

## Task 5: Add The Agent-Key Management Page

**Files:**

- Modify: `web/src/types.ts`
- Modify: `web/src/lib/api.ts`
- Modify: `web/src/lib/query-client.ts`
- Modify: `web/src/app/app.tsx`
- Modify: `web/src/components/layout/admin-shell.tsx`
- Create: `web/src/features/agent-keys/agent-keys-page.tsx`
- Create: `web/src/features/agent-keys/create-agent-key-dialog.tsx`
- Create: `web/src/features/agent-keys/agent-keys-page.test.tsx`

- [ ] **Step 1: Add frontend Agent-key contracts**

Add:

```ts
export type AgentKey = {
  id:string
  name:string
  owner_id:string
  owner_username:string
  created_at:string
}

export type CreatedAgentKey = { id:string; name:string; token:string }
```

Add API and query helpers:

```ts
agentKeys: () => request<AgentKey[]>('/api/agent-tokens'),
createAgentKey: (Name: string) =>
  request<CreatedAgentKey>('/api/agent-tokens', {
    method: 'POST',
    body: JSON.stringify({ Name }),
  }),

agentKeys: ['agent-keys'] as const,
```

- [ ] **Step 2: Add the global sidebar route**

In `web/src/app/app.tsx` add:

```tsx
<Route element={<AgentKeysPage />} path="/agent-keys" />
```

In `admin-shell.tsx`, add a global navigation item with a key icon:

```tsx
{ label: 'Agent 密钥', href: '/agent-keys', icon: KeyRound, testID: 'agent-keys' }
```

Use the explicit `testID` property for every navigation item so the new link
renders:

```tsx
data-test-id="admin-navigation-agent-keys"
```

- [ ] **Step 3: Build the shadcn-based key list page**

Create `AgentKeysPage` with:

```tsx
<AdminShell title="Agent 密钥">
  <section data-test-id="agent-keys-page">
    <header data-test-id="agent-keys-heading">...</header>
    <CreateAgentKeyDialog />
    <Table data-test-id="agent-keys-table">...</Table>
  </section>
</AdminShell>
```

Render name, owner username, and creation time. Render loading, error, and
empty states with stable `data-test-id` values.

- [ ] **Step 4: Build the one-time key dialog**

Create `CreateAgentKeyDialog` using existing shadcn `Dialog`, `Input`, `Label`,
and `Button`. Before creation render a required name field. After creation
replace the form body with:

```tsx
<div data-test-id="create-agent-key-result">
  <p data-test-id="create-agent-key-warning">该密钥仅展示一次，请立即妥善保存。</p>
  <code data-test-id="create-agent-key-token">{created.token}</code>
</div>
```

Invalidate `queryKeys.agentKeys` after success. Clear the one-time plaintext
when the dialog closes.

- [ ] **Step 5: Add page regression coverage**

Create `agent-keys-page.test.tsx` and mock `fetch` responses. Verify:

```text
- the sidebar renders admin-navigation-agent-keys;
- the page renders listed key metadata;
- every page, table, dialog, input, button, warning, and token element has a stable data-test-id;
- creating a key sends {"Name":"codex-local"};
- the plaintext token appears after creation;
- closing and reopening the dialog does not show the previous plaintext token.
```

- [ ] **Step 6: Run focused frontend verification**

Run:

```bash
cd web && npm test -- agent-keys-page
```

Expected: PASS.

- [ ] **Step 7: Commit the Agent-key page**

```bash
git add web/src/types.ts web/src/lib/api.ts web/src/lib/query-client.ts web/src/app/app.tsx web/src/components/layout/admin-shell.tsx web/src/features/agent-keys
git commit -m "feat(ui): add agent key management page"
```

## Task 6: Update Workflow Documentation

**Files:**

- Modify: `README.md`
- Modify: `docs/核心设计.md`

- [ ] **Step 1: Replace the old lock-based workflow description**

Document:

```text
- Requirements are clarified by humans.
- Humans mark clarified requirements agentic_ready to request Agent breakdown.
- Agent breakdown submissions enter technical_breakdown/pending_human_review.
- Human-reviewed breakdowns become agentic_ready for Agent development.
- Development submissions resolve imported Commit SHA values and enter code_review/agentic_ready.
- Agent code-review submissions require final human confirmation.
- Human-approved code review enters human-only test acceptance.
- Rejected work becomes need_redo and must be reopened manually.
```

- [ ] **Step 2: Document Agent-key authentication**

Add a concise Agent API section with:

```http
Authorization: Bearer <agent-key>
```

State that users create keys from the `Agent 密钥` page, plaintext appears only
once, and the system records the owning user and key for submitted Agent work.

- [ ] **Step 3: Check docs for stale lock language**

Run:

```bash
rg -n "锁定|locked|pending_confirmation|needs_changes" README.md docs/核心设计.md
```

Expected: no stale workflow references.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md docs/核心设计.md
git commit -m "docs: describe human-reviewed agent workflow"
```

## Task 7: Run Full Verification And Review The Diff

**Files:**

- Review all modified files.

- [ ] **Step 1: Search for stale lock and old-status references**

Run:

```bash
rg -n "ErrLocked|LockTask|\\.Locked|locked|pending_confirmation|needs_changes|/lock|/unlock|tasks/:taskID/transitions|tasks/:taskID/reviews|tasks/:taskID/submit\\\"" internal web/src migrations README.md docs/核心设计.md
```

Expected: no live-code lock references, old status names, or generic Agent
submit route. Historical migrations may contain the old names only where
required to migrate existing databases.

- [ ] **Step 2: Run backend tests**

Run:

```bash
go test ./...
```

Expected: PASS.

- [ ] **Step 3: Run frontend tests**

Run:

```bash
cd web && npm test
```

Expected: PASS.

- [ ] **Step 4: Build the frontend**

Run:

```bash
cd web && npm run build
```

Expected: PASS.

- [ ] **Step 5: Inspect repository state**

Run:

```bash
git status --short
git log --oneline -8
```

Expected: only intentional changes remain. Do not discard unrelated user
changes.
