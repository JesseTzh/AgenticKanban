# Idempotent Demo Seed Command Design

## Goal

Add a standalone Go command that writes a complete set of local demo data into
the configured SQLite database. The command must be safe to run repeatedly:
existing business data remains untouched and missing demo records are added.

## Command

The entry point is:

```bash
go run ./cmd/seed
```

The command reads the same environment variables as the server. In particular,
`SQLITE_PATH` selects the target database and defaults to
`data/agentic-kanban.db`.

The command creates the parent directory for the SQLite file, opens the
database, applies migrations from `migrations`, invokes the seed package, and
prints a summary of created and skipped records. Database or migration failures
produce a non-zero exit status.

## Structure

Add `cmd/seed/main.go` as a thin command entry point.

Add `internal/seed/seed.go` to define the deterministic demo fixture and perform
the idempotent writes. Keeping the fixture outside the command makes the logic
usable by future local tooling without coupling it to CLI setup.

Update `README.md` with the command, default database path, idempotent behavior,
and local-only account credentials.

## Demo Accounts

The command ensures these local test accounts exist:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `admin` |
| `manager` | `manager123` | `manager` |
| `developer` | `developer123` | `developer` |

`admin` matches server startup behavior. Password hashes use the configured
`SESSION_SECRET`. If an account already exists, the command does not replace
its password or role.

The README explicitly states that these accounts are for local testing only.

## Demo Data

The fixture creates two projects. Each project receives the existing default
board and six default stages.

The primary project contains records that cover:

- Tasks in each workflow stage.
- Representative statuses, including agent-ready, in-progress, pending
  confirmation, needs-changes, test-passed, archived, and locked tasks.
- A parent task and child task.
- A repository and webhook commit records.
- Task-to-commit associations.
- Approval, code review, test acceptance, failed test defect, archive, and
  archive-reference records.

The secondary project provides a smaller independent dataset for project-list
and project-switching tests.

Fixture names and descriptions are deterministic and clearly marked as demo
data.

## Idempotency

Seed-owned entities use stable IDs with a `seed_` prefix where the schema
permits caller-provided IDs. Stable usernames identify seed-owned users.

The seed package checks whether stable records already exist and adds only
missing records. Existing rows are not updated, deleted, or reset. This
preserves user edits and unrelated local data.

Existing `store` methods are used where they can produce the desired record
without compromising idempotency. They preserve normal workflow side effects,
such as task history and audit logs. For records that require exact fixture
state or whose store methods always generate random IDs, the seed package uses
controlled transactional SQL with `INSERT OR IGNORE`.

Each seed operation contributes to a created or skipped count. The CLI prints a
final summary.

## Error Handling

Seeding stops on the first database error and returns contextual information
about the failed fixture step. Multi-row fixture groups use transactions so
partially written related records are avoided.

## Verification

The implementation does not use TDD, following repository instructions.
Verification consists of:

1. Run `go test ./...`.
2. Run `go run ./cmd/seed` against a temporary SQLite file.
3. Run the same seed command a second time against that file.
4. Confirm the second run succeeds without creating duplicate seed records.

