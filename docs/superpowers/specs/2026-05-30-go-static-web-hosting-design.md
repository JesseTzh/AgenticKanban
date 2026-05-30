# Go Static Web Hosting Design

## Goal

Serve the Vite production build from the Go backend so a deployed AgenticKanban
instance can load the React application from the same origin as the API.

## Scope

- Read static assets from a runtime directory.
- Require the static build to exist before the server starts in every
  environment.
- Serve React BrowserRouter routes through an `index.html` fallback.
- Preserve JSON `404` responses for unknown API routes and unsupported methods.
- Document the runtime configuration.

Embedding assets in the Go binary is out of scope. Vite development-server
behavior is unchanged.

## Configuration

Add a static web directory setting to the server configuration. Its environment
variable is `WEB_DIST_PATH`, and its default value is `web/dist`.

The server startup path validates that:

1. `WEB_DIST_PATH` exists and is a directory.
2. `<WEB_DIST_PATH>/index.html` exists and is a regular file.

Any validation failure is a startup configuration error. The server logs the
error and exits before listening for HTTP requests. This applies to all
environments, including local development.

## Router Integration

Pass the validated static directory into `httpapi.NewRouter` through its
dependencies. The router remains the single HTTP entry point for API and web
traffic.

Existing registered API routes keep their current behavior. For requests that
do not match a registered route:

1. Paths under `/api/` return HTTP `404` with `{"error":"not found"}`.
2. `GET` and `HEAD` requests for an existing static file return that file.
3. Other `GET` and `HEAD` requests return `index.html`, allowing React
   BrowserRouter routes such as `/login` and `/projects/:projectID` to load on
   direct navigation.
4. Other unmatched methods return HTTP `404` with `{"error":"not found"}`.

Static file lookup must remain within the configured directory. It must use the
standard library file-serving behavior rather than constructing unrestricted
filesystem paths from request data.

## Deployment

The existing Docker image already copies the Vite output into `/app/web/dist`
and uses `/app` as its working directory, so the default `WEB_DIST_PATH`
continues to work without a Dockerfile change.

For local startup, build the frontend first:

```bash
cd web && npm run build && cd ..
go run ./cmd/server
```

Deployments may override `WEB_DIST_PATH` when the static build is stored
elsewhere.

## Testing

Add configuration coverage for the default `WEB_DIST_PATH` value.

Add router coverage using a temporary static directory:

- `/` serves `index.html`.
- A nested BrowserRouter path serves `index.html`.
- An existing asset serves its contents.
- An unknown `/api/*` path still returns JSON `404`.
- An unmatched non-`GET` request returns JSON `404`.

Add startup validation coverage for:

- A valid directory containing `index.html`.
- A missing directory.
- A directory without `index.html`.

