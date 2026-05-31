# Configurable Light and Dark Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize frontend design tokens, add persistent system-aware light/dark mode switching, and restyle all current pages according to `DESIGN.md`.

**Architecture:** Add a typed `src/theme` module that owns built-in themes, merging, DOM application, persistence, and React context. Keep Tailwind and shadcn semantic utilities as the styling interface, then restyle local shadcn primitives and page layouts with token-backed surfaces, shadows, and test identifiers.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui local components, Vitest, Testing Library

---

### Task 1: Theme Runtime

**Files:**
- Create: `web/src/theme/tokens.ts`
- Create: `web/src/theme/themes.ts`
- Create: `web/src/theme/theme.ts`
- Create: `web/src/theme/theme-provider.tsx`
- Create: `web/src/theme/theme-toggle.tsx`
- Create: `web/src/theme/index.ts`
- Create: `web/src/theme/theme.test.ts`
- Modify: `web/src/main.tsx`
- Modify: `web/src/app/providers.tsx`

- [ ] Define the typed token map and built-in `light` and `dark` themes from `DESIGN.md`.
- [ ] Implement `mergeThemeTokens`, `applyThemeTokens`, persisted-mode parsing, system-preference resolution, and pre-render initialization.
- [ ] Add `ThemeProvider`, `useTheme`, and reusable `ThemeToggle`.
- [ ] Initialize the DOM before React render and wrap the app provider tree.
- [ ] Add focused runtime tests for merge, application, storage precedence, root class synchronization, and system-preference updates.

### Task 2: CSS Variable Bridge and shadcn Primitives

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/components/ui/button.tsx`
- Modify: `web/src/components/ui/input.tsx`
- Modify: `web/src/components/ui/card.tsx`
- Modify: `web/src/components/ui/dialog.tsx`
- Modify: `web/src/components/ui/dropdown-menu.tsx`
- Modify: `web/src/components/ui/table.tsx`
- Modify: `web/src/components/ui/tabs.tsx`
- Modify: `web/src/components/ui/badge.tsx`
- Modify: `web/src/components/ui/alert.tsx`
- Modify: `web/src/components/ui/skeleton.tsx`

- [ ] Remove duplicated CSS defaults and map theme-runtime variables into Tailwind utilities.
- [ ] Add reusable material utility classes for glass surfaces, tonal panels, shadows, and the precision progress line.
- [ ] Restyle local shadcn primitives with strict radii, tonal separation, accessible focus indicators, and token-backed elevation.
- [ ] Preserve component APIs so feature modules need only layout-level changes.

### Task 3: Login and Authenticated Shell

**Files:**
- Modify: `web/src/features/auth/login-page.tsx`
- Modify: `web/src/components/layout/admin-shell.tsx`
- Modify: `web/src/components/layout/page-loading.tsx`
- Modify: `web/src/components/layout/error-alert.tsx`
- Modify: `web/src/app/app.test.tsx`

- [ ] Convert login into a responsive two-region layout with an intentionally empty desktop left region.
- [ ] Add right-region theme toggle and in-card pending precision line.
- [ ] Convert the shell to layered sidebar, header, and content surfaces and add the shared theme toggle.
- [ ] Add stable `data-test-id` values to modified shell, login, loading, and error elements.
- [ ] Extend application rendering tests for login regions, toggle locations, and shell identifiers.

### Task 4: Feature Pages and Dialogs

**Files:**
- Modify: `web/src/features/projects/projects-page.tsx`
- Modify: `web/src/features/projects/create-project-dialog.tsx`
- Modify: `web/src/features/board/board-page.tsx`
- Modify: `web/src/features/board/task-card.tsx`
- Modify: `web/src/features/board/create-task-dialog.tsx`
- Modify: `web/src/features/delivery/delivery-page.tsx`
- Modify: `web/src/features/delivery/create-repository-dialog.tsx`

- [ ] Restyle project cards and empty states with cold tonal panels.
- [ ] Restyle workflow columns and task cards with layered surfaces and spacing.
- [ ] Restyle delivery tabs, data panels, rows, and archive cards.
- [ ] Add stable `data-test-id` values for headings, actions, columns, cards, tabs, tables, and dialog forms.
- [ ] Preserve existing API calls, mutations, and query invalidation behavior.

### Task 5: Verification

**Files:**
- Verify: `web/src/**/*`

- [ ] Run `cd web && npm test`.
- [ ] Run `cd web && npm run build`.
- [ ] Run `git diff --check`.
- [ ] Review `git diff --stat` and confirm backend files were not modified by this implementation.
