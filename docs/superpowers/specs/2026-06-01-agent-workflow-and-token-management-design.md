# Agent Workflow and Token Management Design

## Goal

Replace task locking with an explicit human-review workflow for Agent work,
strengthen Agent API authentication with user-created keys, and record which
user-owned Agent key performed each Agent action.

The system keeps `agent_ready` as the explicit human-controlled switch that
makes work available to Agents. The redundant `locked` task field and all lock
and unlock behavior are removed.

## Scope

This change covers:

- Task workflow changes for Agent-assisted technical breakdown, development,
  and code review.
- Removal of task locking from the database, backend, API, seed data, and web
  UI.
- Dedicated Bearer-token authentication for Agent APIs.
- User-owned Agent key creation and listing.
- A web page for Agent key management.
- Human-review history returned to Agents as retry context.

This change does not cover:

- Agent execution during requirement clarification or test acceptance.
- Key disable, enable, rotation, or deletion.
- Project-scoped Agent keys.
- Parallel execution of the same task by multiple Agent keys.
- Splitting one requirement into multiple technical-breakdown tasks.

## Workflow Model

### Principles

- Requirement clarification and test acceptance are human-only activities.
- A task is available to Agents only when `agent_ready = true` and
  `status = agentic_ready`.
- Claiming a task changes its status to `in_progress`, clears `agent_ready`,
  and binds the task to the claiming Agent key.
- Only the Agent key that claimed a task may submit its result.
- Every Agent submission that requires human judgment changes the task status
  to `pending_human_review`.
- Human rejection changes the task status to `need_redo`. A `need_redo` task is
  not available to Agents until a human explicitly changes it back to
  `agentic_ready`.
- Human review records are append-only history. Agents receive that history
  when listing or fetching work so retries include prior human feedback.

### Stage and Work-Type Matrix

The task stage represents the business artifact currently being handled. The
Agent work type represents the action assigned to the Agent after a claim.

| Task stage before claim | Availability | Agent work type | Agent submission | Task state after submission |
| --- | --- | --- | --- | --- |
| `requirement_clarification` | Human manually marks `agentic_ready` | Technical breakdown | Submit breakdown result | Move to `technical_breakdown`; set `pending_human_review` |
| `technical_breakdown` | Human approves the breakdown and manually marks `agentic_ready` | Development implementation | Submit development result with Commit SHA values | Resolve and link Commits; move to `code_review`; set `agentic_ready` |
| `code_review` | Naturally available after successful development submission | Code review | Submit review opinion and pass/fail verdict | Keep `code_review`; set `pending_human_review` |
| `test_acceptance` | Never available to Agents | None | None | Human-only completion flow |

An Agent submission must use the endpoint that matches the task stage and
claimed work type. Invalid combinations return a conflict response and do not
change task state.

### Human Review Rules

Technical-breakdown review:

- Human approval does not automatically advance the task. The human explicitly
  changes the reviewed technical-breakdown task to `agentic_ready`, making it
  available for development.
- Human rejection keeps the task in `technical_breakdown`, sets `need_redo`,
  and stores the review note.
- To request a rewritten breakdown, a human explicitly changes the task from
  `need_redo` to `agentic_ready`.

Code-review review:

- Agent pass and Agent fail verdicts both require human confirmation.
- Human approval of an Agent pass verdict moves the task to
  `test_acceptance`. Test acceptance remains human-only.
- Human confirmation of an Agent fail verdict moves the task back to
  `technical_breakdown`, sets `need_redo`, and stores the human note.
- Human rejection of an Agent pass verdict also moves the task back to
  `technical_breakdown`, sets `need_redo`, and stores the human note.
- To request another development pass, a human explicitly changes the task
  from `need_redo` to `agentic_ready`.

### Status Names

Rename `pending_confirmation` to `pending_human_review`.

Add or standardize `need_redo` as the retry-required status. Do not use
`needs_changes` for the new Agent workflow. Existing stored statuses are
migrated to the new names where applicable.

## Data Model

### Tasks

Remove:

- `tasks.locked`
- `domain.Task.Locked`
- Lock-related indexes and query filters.

Keep:

- `tasks.agent_ready`
- `tasks.agent_id`

`tasks.agent_id` stores the ID of the Agent key that currently owns or most
recently performed Agent work on the task. Claiming a task overwrites this
field with the current key ID.

### Agent Keys

Use the existing `agent_tokens` table as the Agent-key store:

- `id`: stable Agent key ID.
- `name`: user-provided display name.
- `token_hash`: keyed hash of the secret; plaintext is never stored.
- `created_by`: owning user ID.
- `created_at`: creation time.

The existing `enabled` column may remain for backward-compatible schema
handling, but this scope does not expose enable, disable, or restore behavior.

The plaintext key is returned only once, in the create-key response.

### Agent Runs

Use `agent_runs.agent_id` as the Agent key ID, not a browser user ID.

Each submitted run records:

- Task ID.
- Agent key ID.
- Work type: `technical_breakdown`, `development`, or `code_review`.
- Submitted result text.
- Code-review verdict where applicable.
- Submission status and timestamp.

The run can be joined through `agent_tokens.created_by` to identify the user
whose Agent performed the work.

### Human Review History

Use append-only human-review records as Agent retry context. Extend the
approval model or add a dedicated review-history model so each record contains:

- Task ID.
- Reviewed Agent run ID where applicable.
- Human reviewer user ID.
- Review decision.
- Human note.
- Creation time.

Agent task responses include this ordered review history. No mutable
task-level `AgentContext` field is added.

### Commit Resolution

Development submission accepts Git Commit SHA values, not internal Commit IDs.
For each SHA, the backend resolves an existing Commit previously imported by a
repository webhook and belonging to the task project.

If any SHA cannot be resolved, return a conflict error with code
`commit_sha_not_found` and a clear message containing the missing SHA. Do not
link partial results, create an Agent run, or advance the task.

## Authentication and Authorization

### Browser APIs

Browser APIs continue to use the existing `ak_session` cookie and role-based
authorization.

Any authenticated user may:

- Create an Agent key owned by that user.
- List their own Agent-key metadata.

Administrators may list metadata for all users' Agent keys. Key plaintext is
never returned by list APIs.

### Agent APIs

All `/api/agent/*` endpoints use dedicated Agent-key authentication:

```http
Authorization: Bearer <agent-key>
```

The backend hashes the presented key with `AGENT_TOKEN_SECRET`, resolves the
matching `agent_tokens` row, and stores the Agent key ID in the request context.
Agent APIs do not accept browser sessions as an alternative authentication
method.

Agent keys access the global queue of available tasks. They are not scoped to
projects or restricted according to the owning user's browser role.

## API Design

### Browser Agent-Key APIs

```http
GET /api/agent-tokens
POST /api/agent-tokens
```

`POST /api/agent-tokens` accepts:

```json
{
  "Name": "codex-local"
}
```

It returns the plaintext key once:

```json
{
  "id": "agt_...",
  "name": "codex-local",
  "token": "..."
}
```

`GET /api/agent-tokens` returns metadata only. Regular users receive their own
keys. Administrators receive all keys, including owning-user metadata.

### Agent Task APIs

```http
GET /api/agent/tasks
POST /api/agent/tasks/:taskID/claim
POST /api/agent/tasks/:taskID/submit-breakdown
POST /api/agent/tasks/:taskID/submit-development
POST /api/agent/tasks/:taskID/submit-code-review
```

`GET /api/agent/tasks` returns available tasks and their ordered human-review
history.

`POST /api/agent/tasks/:taskID/submit-breakdown` accepts:

```json
{
  "Result": "Technical breakdown content"
}
```

`POST /api/agent/tasks/:taskID/submit-development` accepts:

```json
{
  "Result": "Development summary",
  "CommitSHAs": ["0123456789abcdef"]
}
```

`POST /api/agent/tasks/:taskID/submit-code-review` accepts:

```json
{
  "Result": "Code-review opinion",
  "Passed": true
}
```

The existing generic Agent submit endpoint is removed.

### Error Handling

Use stable API-envelope error codes:

- `unauthorized`: missing or invalid Agent key.
- `invalid_transition`: task stage or status is incompatible with the action.
- `agent_claim_mismatch`: a different Agent key claimed the task.
- `commit_sha_not_found`: a submitted SHA was not found in imported project
  Commits.
- `not_found`: task or Agent key does not exist.

## Web UI

### Lock Removal

Remove:

- Locked badge from task cards.
- Locked row from the task-detail dialog.
- Lock-related API assumptions and tests.

### Agent-Key Page

Add a sidebar entry and route for an `Agent 密钥` page.

The page contains:

- A heading and concise explanation.
- A key list showing name, owner where visible, and creation time.
- A create-key button.
- A shadcn dialog with a key-name input.
- A one-time plaintext-key result after successful creation, with a clear
  warning that it will not be shown again.

Every rendered page element, dialog element, table element, button, input,
message, and navigation element receives a stable `data-test-id`.

## Migration

Add a forward migration that:

1. Removes lock-related indexes.
2. Removes `tasks.locked`.
3. Recreates the Agent-ready index without `locked`.
4. Renames persisted `pending_confirmation` statuses to
   `pending_human_review`.
5. Renames persisted `needs_changes` statuses to `need_redo`.
6. Extends Agent-run and human-review storage for work type, review verdict,
   and review-to-run association.

SQLite migrations must use a table-rebuild pattern where required by the
supported SQLite version.

Update the initial schema so new databases are created directly in the final
shape.

## Documentation

Update `README.md` and `docs/核心设计.md` to describe:

- Human-only requirement clarification.
- Agent technical breakdown, development, and code-review work.
- Mandatory human review of Agent output.
- Human-controlled `agentic_ready`.
- `need_redo` retry behavior.
- Human-only test acceptance.
- User-created Agent keys and Bearer authentication.

## Verification

Backend coverage must verify:

- Lock fields and lock endpoints are gone.
- Browser users create keys; plaintext appears only in the create response.
- Regular users list only their own keys; administrators list all metadata.
- Invalid Agent keys receive `401`.
- Agent task listing includes only `agentic_ready` tasks and includes ordered
  human-review history.
- Claiming binds the task to one Agent key.
- Another key cannot claim or submit the task.
- Breakdown submission moves requirement clarification to technical breakdown
  with `pending_human_review`.
- Development submission resolves project Commit SHA values, rejects missing
  SHA values atomically, and advances valid work to code review with
  `agentic_ready`.
- Code-review submission stores verdict and opinion, then sets
  `pending_human_review`.
- Human rejection produces `need_redo` and does not expose the task until a
  human explicitly marks it `agentic_ready`.
- Human approval of a passed code review advances to human-only test
  acceptance.

Frontend coverage must verify:

- Task cards and task-detail dialogs no longer render lock state.
- The sidebar renders the Agent-key navigation entry.
- The Agent-key page lists metadata.
- The create-key dialog renders the returned plaintext key exactly as a
  one-time result.
- New rendered elements expose stable `data-test-id` values.

Run:

```bash
go test ./...
cd web && npm test
cd web && npm run build
```
