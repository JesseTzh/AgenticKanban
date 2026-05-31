# Idempotent Demo Seed Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an idempotent `go run ./cmd/seed` command that writes complete local demo data and document its usage.

**Architecture:** A focused `internal/seed` package owns deterministic fixture definitions and transactional `INSERT OR IGNORE` writes. A thin `cmd/seed` entry point loads configuration, prepares SQLite, applies migrations, invokes the package, and prints counts. Existing user data is preserved.

**Tech Stack:** Go, `database/sql`, SQLite through `modernc.org/sqlite`, existing `internal/auth`, `internal/config`, and `internal/db` packages.

---

### Task 1: Seed Package

**Files:**
- Create: `internal/seed/seed.go`

- [ ] **Step 1: Add deterministic seed definitions**

Define stable IDs for users, projects, boards, tasks, repositories, commits,
approvals, reviews, test records, archives, and archive references. Define a
`Summary` type with created and skipped counts.

- [ ] **Step 2: Add transactional idempotent helpers**

Implement an `insert` helper around `INSERT OR IGNORE` and `RowsAffected`.
Increment `Summary.Created` when a row is inserted and `Summary.Skipped` when
the stable row already exists. Wrap fixture writes in one transaction and
return contextual errors.

- [ ] **Step 3: Populate complete demo fixtures**

Insert:

- `admin`, `manager`, and `developer` users with hashes from
  `auth.HashPassword`.
- Two projects, default boards, and default stages from
  `domain.DefaultStages()`.
- Primary-project tasks covering all workflow stages, representative statuses,
  parent-child relationships, agent-ready state, and locked state.
- One secondary-project task.
- Repository, webhook event, commits, task-commit links, agent run, approval,
  review, passed and failed test records, generated defect task, archive,
  archive reference, task histories, and audit logs.

- [ ] **Step 4: Format and compile**

Run: `gofmt -w internal/seed/seed.go`

Run: `go test ./internal/seed`

Expected: package compiles successfully with `[no test files]`.

### Task 2: Seed CLI

**Files:**
- Create: `cmd/seed/main.go`

- [ ] **Step 1: Add thin CLI entry point**

Load `config.Load()`, create the parent directory for `cfg.SQLitePath`, call
`db.Open`, apply `db.Migrate(database, "migrations")`, invoke
`seed.Run(context.Background(), database, cfg.SessionSecret)`, and print:

```text
seed complete: created=<n> skipped=<n>
```

Exit through `log.Fatal` on setup, migration, or seed errors.

- [ ] **Step 2: Format and compile**

Run: `gofmt -w cmd/seed/main.go`

Run: `go test ./cmd/seed`

Expected: package compiles successfully with `[no test files]`.

### Task 3: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add local demo-data usage**

Document:

```bash
go run ./cmd/seed
```

Explain that the command defaults to `data/agentic-kanban.db`, honors
`SQLITE_PATH`, applies migrations, preserves existing data, and only adds
missing fixed demo records.

- [ ] **Step 2: Document local-only credentials**

List:

```text
admin / admin123
manager / manager123
developer / developer123
```

State that they are for local testing only.

### Task 4: Verification

**Files:**
- Verify: `internal/seed/seed.go`
- Verify: `cmd/seed/main.go`
- Verify: `README.md`

- [ ] **Step 1: Run backend tests**

Run: `go test ./...`

Expected: all packages pass.

- [ ] **Step 2: Verify first seed execution**

Run:

```bash
SQLITE_PATH=/tmp/agentic-kanban-seed-verification.db go run ./cmd/seed
```

Expected: command succeeds with `created` greater than zero.

- [ ] **Step 3: Verify repeated seed execution**

Run the same command again.

Expected: command succeeds with `created=0` and all stable fixture rows counted
as skipped.

- [ ] **Step 4: Inspect final diff**

Run: `git status --short`

Run: `git diff -- README.md cmd/seed/main.go internal/seed/seed.go`

Expected: only the intended seed command, seed package, README, and plan
changes are part of this implementation; existing frontend edits remain
untouched.

