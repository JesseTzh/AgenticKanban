# Login Panel Layout and Remember Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the login panel after the NexVault reference and make the remember-login checkbox control whether the HttpOnly session cookie persists across browser restarts.

**Architecture:** Extend the existing login request with a `remember` boolean and keep authentication cookie-based. The Go login handler chooses a session cookie or persistent cookie while the React login page owns the checkbox and reference-inspired layout.

**Tech Stack:** Go, Gin, React 19, TypeScript, Tailwind CSS 4, shadcn UI, lucide-react, Vitest

---

### Task 1: Add conditional cookie persistence

**Files:**
- Modify: `internal/httpapi/router.go`
- Modify: `internal/httpapi/router_test.go`

- [x] Parse `remember` from the login request body.
- [x] Set Cookie `Max-Age` to `0` for default login and `SESSION_TTL` seconds when `remember` is true.
- [x] Add backend tests for both Cookie modes.
- [x] Run `go test ./internal/httpapi`.

### Task 2: Restyle the login panel and wire the checkbox

**Files:**
- Modify: `web/src/lib/api.ts`
- Modify: `web/src/features/auth/login-page.tsx`
- Modify: `web/src/app/app.test.tsx`

- [x] Add `remember` to the frontend login request.
- [x] Replace the login `Card` with a right-side translucent panel and reference-inspired form structure.
- [x] Add username and password icons, the remember-login checkbox, and `data-test-id` attributes.
- [x] Add frontend tests for default and checked login requests.
- [x] Run `npm run test` in `web`.

### Task 3: Verify the complete change

**Files:**
- Verify only

- [x] Run `go test ./...`.
- [x] Run `npm run build` in `web`.
- [x] Run `git diff --check`.
