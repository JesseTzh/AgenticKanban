# Dependency Pinning and shadcn/ui Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin all direct dependencies, fix the TypeScript 6 build, and replace the single-file frontend with a shadcn/ui-based admin interface backed by TanStack Query.

**Architecture:** Preserve the current backend API contract and routes. Split the frontend into application providers, shared UI primitives, layout components, and focused feature pages. Upgrade Go modules only where required by the approved technology table and adapt import-path API changes.

**Tech Stack:** React 19.2.6, TypeScript 6.0.3, Vite 8.0.14, Tailwind CSS 4.3.0, shadcn/ui local components, TanStack Query 5.100.14, Go 1.26.3, Gin 1.12.0, Casbin v3.10.0, Ristretto v2.4.0, modernc.org/sqlite, sqlc 1.31.1.

---

## File Structure

- Modify `web/package.json`, `web/package-lock.json`, `web/tsconfig.json`, and
  `web/vite.config.ts` for exact frontend dependency versions, Tailwind, and
  aliases.
- Create `web/components.json` and `web/src/index.css` for shadcn/ui and
  Tailwind configuration.
- Create `web/src/lib/*` for API access, query keys, and utility classes.
- Create `web/src/components/ui/*` for local shadcn/ui primitives.
- Create `web/src/components/layout/*` for the authenticated admin shell.
- Create `web/src/features/*` for login, projects, board, and delivery pages.
- Replace `web/src/main.tsx` with the application bootstrap.
- Create `web/src/app/*` for router and providers.
- Create `web/src/app/app.test.tsx` for UI regression coverage.
- Modify `go.mod`, `go.sum`, `internal/cache/cache.go`, and
  `internal/permission/permission.go` for Go dependency upgrades.
- Create `tools/tools.go` to pin the sqlc tool module.
- Modify `Dockerfile` and `README.md` for pinned toolchain and deployment
  requirements.

### Task 1: Frontend Build Configuration and Exact Dependencies

- [ ] Record the current `npm run build` failure caused by
  `moduleResolution=node10`.
- [ ] Replace every direct npm dependency version with an exact version and add
  Tailwind CSS, the Tailwind Vite plugin, TanStack Query, and the runtime
  dependencies required by the selected shadcn/ui primitives.
- [ ] Configure `moduleResolution: "Bundler"`, `baseUrl`, and `@/*` aliases in
  `web/tsconfig.json`.
- [ ] Configure the Tailwind Vite plugin and alias in `web/vite.config.ts`.
- [ ] Add `web/components.json` and Tailwind theme CSS in `web/src/index.css`.
- [ ] Run `npm install` to regenerate `web/package-lock.json`.
- [ ] Run `npm run build`; expect remaining failures only if frontend imports
  still refer to files moved in later tasks.

### Task 2: UI Regression Tests

- [ ] Create `web/src/app/app.test.tsx` with a login route test that asserts
  username, password, and login controls render.
- [ ] Add an authenticated shell test that renders layout navigation and
  asserts projects, board, and delivery links.
- [ ] Run `npm test -- app.test.tsx`; expect failure because the new app and
  shell modules do not exist yet.

### Task 3: shadcn/ui Primitive Layer

- [ ] Create `web/src/lib/utils.ts` with the standard `cn()` helper.
- [ ] Add local shadcn/ui primitives used by the redesign: `alert`, `badge`,
  `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `separator`,
  `skeleton`, `table`, and `tabs`.
- [ ] Confirm all visible buttons, inputs, cards, badges, dialogs, tabs, and
  tables in feature code can import these primitives from `@/components/ui`.

### Task 4: Application Providers and Admin Shell

- [ ] Move the API client into `web/src/lib/api.ts` and preserve all existing
  endpoint contracts.
- [ ] Add `web/src/lib/query-client.ts` and stable query-key helpers.
- [ ] Create `web/src/app/providers.tsx` with `QueryClientProvider` and
  `BrowserRouter`.
- [ ] Create `web/src/components/layout/admin-shell.tsx` with responsive
  sidebar navigation, header title, and logout action.
- [ ] Run `npm test -- app.test.tsx`; expect the admin-shell regression test to
  pass once its module exists.

### Task 5: Feature Pages and Router

- [ ] Create `web/src/features/auth/login-page.tsx` using shadcn/ui `Card`,
  `Input`, `Label`, `Button`, and `Alert`.
- [ ] Create `web/src/features/projects/projects-page.tsx` and
  `create-project-dialog.tsx` using TanStack Query.
- [ ] Create `web/src/features/board/board-page.tsx`,
  `create-task-dialog.tsx`, and `task-card.tsx`; preserve all six stages and
  existing task actions.
- [ ] Create `web/src/features/delivery/delivery-page.tsx` and
  `create-repository-dialog.tsx`; render repository and commit tables plus
  archive cards inside tabs.
- [ ] Create `web/src/app/app.tsx` with the existing routes and replace
  `web/src/main.tsx` with provider bootstrap.
- [ ] Remove obsolete handwritten `web/src/style.css` and old `web/src/api.ts`.
- [ ] Run `npm test` and `npm run build`; both must pass.

### Task 6: Go Dependency Upgrade

- [ ] Update `go.mod` to Go `1.26.3`, Gin `v1.12.0`, Casbin
  `github.com/casbin/casbin/v3 v3.10.0`, and Ristretto
  `github.com/dgraph-io/ristretto/v2 v2.4.0`.
- [ ] Upgrade `modernc.org/sqlite` to an explicit verified module version and
  record the actual embedded SQLite engine version.
- [ ] Adapt `internal/permission/permission.go` imports to Casbin v3.
- [ ] Adapt `internal/cache/cache.go` to Ristretto v2 generics while preserving
  its wrapper API.
- [ ] Add `tools/tools.go` with a build-tagged blank import for
  `github.com/sqlc-dev/sqlc/cmd/sqlc`.
- [ ] Run `go mod tidy`, `go test ./...`, and `go build ./cmd/server`.

### Task 7: Docker and Documentation

- [ ] Pin the Node builder image to a concrete Node 22 bookworm patch tag and
  pin the Go builder image to `golang:1.26.3-bookworm`.
- [ ] Update README setup instructions, generation command, and documented
  Docker Engine `29.5.2` / Compose `5.1.4` requirements.
- [ ] Scan application manifests for residual `latest`, caret, or tilde direct
  dependency versions.
- [ ] Run `npm test`, `npm run build`, `go test ./...`, and
  `go build ./cmd/server` again.
- [ ] Run `docker build .` when the local Docker daemon is available; report
  explicitly if it is unavailable.

## Execution Constraints

The current workspace has no `.git` directory. Git worktrees and per-task
commits are unavailable. Execute in the current directory and report this
constraint with the final verification results.
