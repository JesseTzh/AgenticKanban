# Login Workflow Showcase Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full Stitch workflow showcase animation to the desktop login page with light, dark, and reduced-motion support.

**Architecture:** Create a login-only React component that owns deterministic demo workflow state and advances through scan, verify, and transfer phases with cleaned-up timers. Keep visual effects in scoped CSS classes and integrate the component into the existing responsive login layout without changing authentication behavior.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn Card, lucide-react, Vitest, Testing Library

---

### Task 1: Build the workflow showcase component

**Files:**
- Create: `web/src/features/auth/login-workflow-showcase.tsx`

- [x] Define five workflow stages and deterministic demo tasks.
- [x] Add a media-query hook for desktop and reduced-motion behavior.
- [x] Implement cleaned-up phase timers for scan, verify, transfer, stage focus, replenishment, and final-stage removal.
- [x] Render the decorative showcase with shadcn `Card`, lucide icons, and `data-test-id` attributes.

### Task 2: Add scoped animation styles and integrate the login page

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/features/auth/login-page.tsx`

- [x] Add scoped grid, glow, carousel, task scan, task verify, transfer, spin, and reduced-motion styles.
- [x] Replace the desktop empty login region with `LoginWorkflowShowcase`.
- [x] Keep the form, theme toggle, and authentication behavior unchanged.

### Task 3: Cover rendering and accessibility behavior

**Files:**
- Modify: `web/src/app/app.test.tsx`

- [x] Update the `matchMedia` test stub so desktop showcase rendering is explicit.
- [x] Verify the five stage cards and the existing form controls render.
- [x] Verify mobile width omits the showcase.
- [x] Verify reduced motion marks the showcase static and timer progression does not start.

### Task 4: Verify the frontend

**Files:**
- Verify only

- [x] Run `npm run test` in `web`.
- [x] Run `npm run build` in `web`.
- [x] Inspect `git diff --check`.
