# Unified API Envelope and Auth Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap every `/api/*` JSON response in a consistent envelope and redirect the browser to `/login` when any API request returns `401`.

**Architecture:** Centralize Gin JSON output behind success and error helpers, then migrate every handler and middleware response through those helpers. Keep feature components unaware of the envelope by unwrapping `data` in the shared frontend request function, where session-expiry redirects also belong.

**Tech Stack:** Go, Gin, React, TypeScript, Vitest, Testing Library

---

### Task 1: Centralize Backend Responses

**Files:**
- Modify: `internal/httpapi/router.go`

- [x] Add `success`, `failure`, and store error classification helpers.
- [x] Replace all ad hoc JSON responses for health checks, middleware, browser APIs, Agent APIs, webhooks, and API fallbacks.
- [x] Preserve existing HTTP status codes and endpoint-specific payloads inside `data`.

### Task 2: Adapt Backend Tests and Documentation

**Files:**
- Modify: `internal/httpapi/router_test.go`
- Modify: `README.md`

- [x] Update workflow tests to unwrap successful `data`.
- [x] Assert structured envelopes for API fallback, session `401`, Agent Token `401`, and webhook secret `401`.
- [x] Document the shared success and error shapes and the breaking API change.
- [x] Run `go test ./internal/httpapi`.

### Task 3: Unwrap Frontend Responses and Redirect on 401

**Files:**
- Modify: `web/src/lib/api.ts`
- Create: `web/src/lib/api.test.ts`

- [x] Parse `{ data, error }` envelopes in the shared request function.
- [x] Redirect protected-page `401` responses to `/login`.
- [x] Keep login-page `401` responses on `/login` so invalid credentials remain visible.
- [x] Add frontend regression tests for unwrapping, structured errors, redirect, and login-page behavior.
- [x] Run `npm test -- src/lib/api.test.ts` from `web`.

### Task 4: Verify the Integrated Change

**Files:**
- Review: `internal/httpapi/router.go`
- Review: `web/src/lib/api.ts`
- Review: `README.md`

- [x] Run `gofmt -w internal/httpapi/router.go internal/httpapi/router_test.go`.
- [x] Run `go test ./...`.
- [x] Run `npm test` from `web`.
- [x] Run `npm run build` from `web`.
- [x] Inspect `git diff --check` and the final diff without reverting unrelated workspace changes.
