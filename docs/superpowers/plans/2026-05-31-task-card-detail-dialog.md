# Task Card Detail Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify kanban task cards and open a read-only task detail dialog when a card is clicked.

**Architecture:** Add a focused `TaskDetailDialog` component that renders existing `Task` data with shadcn dialog primitives. Update `TaskCard` to manage dialog state, keep menu actions independent from card clicks, and move the existing menu trigger to the bottom-right footer.

**Tech Stack:** React, TypeScript, shadcn UI, Radix Dialog, Tailwind CSS, Vite

---

### Task 1: Add Task Detail Dialog

**Files:**
- Create: `web/src/features/board/task-detail-dialog.tsx`

- [ ] **Step 1: Add the read-only dialog component**

Create a controlled `TaskDetailDialog` with `task`, `open`, and `onOpenChange`
props. Render title, description, stage, status, assignee, locked state, and
agent-ready state from the existing task object. Add stable `data-test-id`
attributes to each element.

- [ ] **Step 2: Run frontend build**

Run: `cd web && npm run build`

Expected: PASS.

### Task 2: Update Task Card Interaction And Layout

**Files:**
- Modify: `web/src/features/board/task-card.tsx`

- [ ] **Step 1: Open task details from card interaction**

Add local dialog state to `TaskCard`. Make the card keyboard-focusable and open
the dialog on click, Enter, or Space. Render `TaskDetailDialog` next to the card.

- [ ] **Step 2: Simplify card content**

Remove the description paragraph from the card body. Keep the title and status
badges. Move the existing dropdown trigger into a right-aligned card footer.

- [ ] **Step 3: Keep action menu independent**

Stop click and keyboard propagation from the dropdown trigger so opening or
using the menu does not open the detail dialog.

- [ ] **Step 4: Run frontend verification**

Run: `cd web && npm run build && npm test -- --run`

Expected: PASS.
