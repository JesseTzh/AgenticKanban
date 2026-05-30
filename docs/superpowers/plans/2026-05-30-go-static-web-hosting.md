# Go Static Web Hosting Implementation Plan

> **For agentic workers:** Implement the tasks below in order. The user explicitly requested implementation without TDD; add regression coverage and run verification after the code changes.

**Goal:** Serve the Vite production build from the Go backend and fail startup when the runtime static directory is invalid.

**Architecture:** Add `WEB_DIST_PATH` to configuration, validate it in the server startup path, and pass it through the existing HTTP dependencies. Extend Gin's unmatched-route handling to preserve API JSON 404s while serving static files and React BrowserRouter fallbacks.

**Tech Stack:** Go, Gin, `net/http`, Vite, Docker Compose

---

### Task 1: Configuration and startup validation

**Files:**
- Modify: `internal/config/config.go`
- Modify: `cmd/server/main.go`
- Create: `internal/config/config_test.go`
- Create: `cmd/server/main_test.go`

- [x] Add `WEB_DIST_PATH` with default `web/dist`.
- [x] Validate the configured directory and its `index.html` before opening the database.
- [x] Add regression coverage for defaults and validation errors.

### Task 2: Static serving and SPA fallback

**Files:**
- Modify: `internal/httpapi/router.go`
- Modify: `internal/httpapi/router_test.go`

- [x] Serve existing static files for unmatched `GET` and `HEAD` requests.
- [x] Fall back to `index.html` for unmatched frontend paths.
- [x] Preserve JSON 404s for unknown API paths and unmatched non-frontend methods.
- [x] Add regression coverage for root, nested frontend routes, assets, and 404 boundaries.

### Task 3: Runtime documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `configs/config.example.env`

- [x] Document `WEB_DIST_PATH` and the required frontend build.
- [x] Run `gofmt` on changed Go files.
- [x] Run `go test ./...`.
- [x] Run `npm test` and `npm run build` in `web`.
