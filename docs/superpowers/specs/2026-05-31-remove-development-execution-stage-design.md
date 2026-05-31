# Remove Development Execution Stage Design

## Goal

Remove the `development_execution` workflow stage completely and rename the
Chinese display name for `code_review` from `代码复核` to `代码审核`.

The standard workflow becomes:

`需求澄清 -> 技术拆解 -> 代码审核 -> 测试验收 -> 完成归档`

## Scope

### Domain Model

- Delete the `StageDevelopmentExecution` constant.
- Remove the development execution stage from `DefaultStages`.
- Keep the `code_review` key unchanged and rename only its Chinese display
  name.
- Reduce the default board stage count from six to five.

### Workflow Behavior

Agent execution remains supported while a task is in the technical breakdown
stage. The existing agent-ready status, claim, submit, and approval operations
continue to represent task execution progress.

- When an agent submission is approved from technical breakdown, move the task
  to code review.
- When a code review is rejected, move the task back to technical breakdown
  with `needs_changes`.
- When a test fails, move the parent task back to technical breakdown with
  `needs_changes`.
- Create the test-failure defect task in technical breakdown with
  `agentic_ready`.

### Seed Data

Delete every demo task whose stage is development execution. Do not migrate or
replace those demo tasks.

### Frontend

- Remove the development execution column from the board workflow definition.
- Remove the "到开发执行" task action.
- Remove the development execution node from the login workflow showcase.
- Rename every current user-facing `代码复核` label to `代码审核`.
- Preserve existing `data-test-id` coverage for rendered page elements and
  update tests that asserted the removed showcase node.

### Documentation

Update the current product documentation in `README.md` and `docs/核心设计.md`
where workflow terminology is affected. Historical specs and plans remain
unchanged because they describe prior implementation work.

## Compatibility

No forward compatibility is required for existing database rows whose
`stage_key` is `development_execution`. This change does not add a migration or
fallback mapping for old stage values.

## Testing

The implementation will not use TDD, following repository instructions.

After implementation:

- Run the Go test suite.
- Run the frontend test suite.
- Run the frontend build.
- Search active source files to confirm that `development_execution`, `开发执行`,
  and user-facing `代码复核` references have been removed.
