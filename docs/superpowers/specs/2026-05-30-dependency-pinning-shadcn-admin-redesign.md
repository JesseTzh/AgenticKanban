# Dependency Pinning and shadcn/ui Admin Redesign

## Context

The frontend build currently fails after `npm install` because `package.json`
uses `"latest"` for TypeScript. The resulting TypeScript 6.0.3 installation
rejects the legacy `moduleResolution: "Node"` setting, which maps to the
deprecated `node10` strategy.

The frontend is also a single compressed `main.tsx` MVP with handwritten CSS.
The requested change is broader than fixing the compiler setting: pin direct
dependencies to explicit versions and rebuild the frontend as a maintainable
business admin interface using shadcn/ui, Tailwind CSS 4, and TanStack Query.

## Scope

### Included

- Pin every direct npm dependency to an exact version. Do not retain `latest`,
  caret, or tilde ranges.
- Migrate TypeScript module resolution to `Bundler`.
- Add Tailwind CSS 4 and the Vite Tailwind plugin.
- Use shadcn/ui local component source throughout the visible frontend.
- Add TanStack Query for request loading, error, mutation, and invalidation
  state.
- Split the frontend into app, layout, reusable UI, feature, and utility
  modules.
- Preserve existing backend API behavior and route URLs.
- Upgrade and pin direct Go dependencies described below.
- Pin the Go toolchain and Docker build image.
- Add a pinned sqlc tool dependency and a generation command without rewriting
  all current hand-written SQL access code.
- Update README instructions and document deployment environment versions.

### Excluded

- Dark mode.
- Drag-and-drop Kanban interactions.
- Pagination, complex filtering, or sorting.
- New backend API behavior.
- Rewriting all store queries to sqlc-generated repository code.
- Installing Docker Engine or Docker Compose from application code.

## Frontend Architecture

The frontend will use these layers:

- `src/app`: application bootstrap, router, and providers.
- `src/components/ui`: shadcn/ui local component source.
- `src/components/layout`: admin sidebar, header, and page shell.
- `src/features/auth`: login page.
- `src/features/projects`: project list and project creation dialog.
- `src/features/board`: Kanban board, task card, task creation dialog, and task
  action menu.
- `src/features/delivery`: repositories, commits, archives, and repository
  creation dialog.
- `src/lib`: API client, query client, shared helpers, and utility classes.
- `src/types`: shared API types.

React Router keeps the existing URLs:

- `/login`
- `/`
- `/projects/:projectID`
- `/projects/:projectID/repositories`

TanStack Query owns server state. Queries show skeleton loading states and
explicit errors. Mutations invalidate the relevant query keys after success.
Authentication failures redirect to `/login`.

## UI Design

The application uses shadcn/ui's `new-york` style with a neutral light admin
theme.

The login page uses `Card`, `Input`, `Label`, `Button`, and `Alert`.

Authenticated pages use a fixed admin shell:

- Sidebar navigation for projects and the active project's board and delivery
  pages.
- Header with page title and logout action.
- Main content area with responsive spacing.

The projects page uses overview cards and a project creation `Dialog`.

The board page keeps the six existing workflow stages in a horizontal layout.
Columns and tasks use `Card`; task state uses `Badge`; actions use
`DropdownMenu`; task creation uses `Dialog`.

The delivery page uses `Tabs` for repositories, commits, and archives.
Repositories and commits use `Table`; archives use cards. Repository creation
uses `Dialog`.

Empty lists display a clear empty state. Request failures display `Alert`.

## Version Policy

All direct npm dependencies use exact versions. Required versions from the
project technology table are:

| Dependency | Version |
| --- | --- |
| React | `19.2.6` |
| React DOM | `19.2.6` |
| TypeScript | `6.0.3` |
| Vite | `8.0.14` |
| React Router DOM | `7.16.0` |
| TanStack Query | `5.100.14` |
| Tailwind CSS | `4.3.0` |

shadcn/ui is a source generator rather than a runtime component dependency.
Its generated runtime dependencies and the existing frontend tooling
dependencies will also be pinned to exact versions.

The Go module will use:

| Dependency | Version |
| --- | --- |
| Go toolchain | `1.26.3` |
| Gin | `v1.12.0` |
| Casbin | `github.com/casbin/casbin/v3 v3.10.0` |
| Ristretto | `github.com/dgraph-io/ristretto/v2 v2.4.0` |
| sqlc tool | `github.com/sqlc-dev/sqlc/cmd/sqlc v1.31.1` |

The application imports `modernc.org/sqlite`, a CGo-free Go driver with its own
module version. The driver module will be pinned to an explicit verified
version. The SQLite engine version is determined by the selected driver
release; it must be reported accurately rather than represented as a Go module
version.

Docker Engine `29.5.2` and Docker Compose `5.1.4` are deployment environment
requirements. They will be documented but are not application dependencies.

## Backend Compatibility Changes

Casbin imports move from `github.com/casbin/casbin/v2` to
`github.com/casbin/casbin/v3`.

Ristretto imports move from `github.com/dgraph-io/ristretto` to
`github.com/dgraph-io/ristretto/v2`. The cache wrapper will adapt to the v2
generic API while preserving the existing wrapper interface used by the HTTP
layer.

The Docker Go builder image will use Go `1.26.3`.

## Testing and Verification

Frontend tests will cover:

- Existing workflow helper behavior.
- Login page form rendering with shadcn/ui controls.
- Authenticated admin shell navigation rendering.

Verification commands:

```bash
rg -n '"latest"|\\^|~' web/package.json
cd web && npm install
cd web && npm test
cd web && npm run build
go mod tidy
go test ./...
go build ./cmd/server
docker build .
```

Docker verification is conditional on a usable local Docker daemon. Any
unavailable verification step must be reported explicitly.

## Constraints

The current workspace does not contain a `.git` directory. The design document
can be written and reviewed, but it cannot be committed until the workspace is
placed in a Git repository.
