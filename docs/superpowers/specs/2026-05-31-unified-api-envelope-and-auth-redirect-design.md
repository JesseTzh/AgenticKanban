# Unified API Envelope and Auth Redirect Design

## Goal

Standardize every `/api/*` JSON response behind one envelope and redirect the
browser application to `/login` whenever an API request reports that its
session is no longer authenticated.

This is an intentional breaking API change. Existing browser, Agent Token, and
Git webhook clients must consume the new envelope. The server will not provide
a legacy response mode.

## Scope

The envelope applies to every JSON API response:

- Health checks.
- Browser login, logout, and authenticated endpoints.
- Agent Token endpoints under `/api/agent/*`.
- Git webhook endpoints.
- API not-found responses.
- Authentication, authorization, validation, conflict, and storage errors.

Static web files and React BrowserRouter fallbacks remain raw file responses.
They are not JSON APIs and are outside the envelope contract.

## Response Contract

### Successful Responses

Every successful JSON response contains `data` and a null `error`:

```json
{
  "data": {},
  "error": null
}
```

The value of `data` preserves the endpoint-specific payload:

- Collection endpoints return an array in `data`.
- Entity endpoints return the entity in `data`.
- Mutation endpoints without another result return `{ "ok": true }` in
  `data`.
- Composite endpoints retain their named fields inside `data`.

Collection endpoints return an empty array when no records exist. They do not
return `null`.

Examples:

```json
{
  "data": [],
  "error": null
}
```

```json
{
  "data": {
    "repository": {},
    "webhook_url": "http://example.test/api/webhooks/repo-id/secret"
  },
  "error": null
}
```

### Error Responses

Every failed JSON response contains null `data` and a structured `error`:

```json
{
  "data": null,
  "error": {
    "code": "unauthorized",
    "message": "unauthorized"
  }
}
```

`error.code` is a stable, machine-readable snake-case identifier.
`error.message` is a human-readable description suitable for display or logs.
Clients must branch on the HTTP status code or `error.code`, not on
`error.message`.

### Metadata

The initial contract omits `meta`. Current collection endpoints are not
paginated, so an always-null metadata field would add noise without value.

When pagination or other response-level metadata is introduced, successful
responses may add a `meta` object without changing the meaning of `data` or
`error`:

```json
{
  "data": [],
  "error": null,
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

## HTTP Semantics

The server retains meaningful HTTP status codes:

| Status | Meaning |
| --- | --- |
| `200` | Successful read, update, delete, action, health check, or webhook |
| `201` | Successful resource creation |
| `400` | Invalid JSON, validation failure, or unsupported request data |
| `401` | Missing, invalid, or expired session, Agent Token, or webhook secret |
| `403` | Authenticated caller lacks permission |
| `404` | Resource or API route does not exist |
| `409` | Request conflicts with workflow or resource state |

The JSON envelope does not duplicate the HTTP status code.

## Backend Design

Add response helpers in `internal/httpapi` so handlers no longer construct
response bodies ad hoc:

- A success helper writes `{ "data": payload, "error": null }`.
- An error helper writes `{ "data": null, "error": { "code": code,
  "message": message } }`.
- Existing error classification maps known store errors to HTTP statuses and
  stable codes such as `not_found`, `commit_required`, and `locked`.
- Middleware responses for unauthenticated and forbidden requests use the same
  error helper.
- API route fallback responses use the same `not_found` error helper.

Handlers keep their existing endpoint-specific payloads, but pass them through
the success helper. This keeps the change focused on the transport contract.

## Frontend Design

Update `web/src/lib/api.ts` so `request<T>()` parses the envelope:

- For successful HTTP responses, return `body.data` as `T`.
- For failed HTTP responses, throw an `Error` using
  `body.error.message` when available.
- If a response has HTTP status `401` and the current browser path is not
  `/login`, redirect with `window.location.href = "/login"`.
- If the current path is `/login`, do not redirect. Login failures remain on
  the page and display the server message.

Because the API wrapper unwraps `data`, feature components and TanStack Query
hooks continue receiving their current entity and array types. They do not
need envelope-specific logic.

## External Client Impact

Agent and Git webhook callers must read successful payloads from `data` and
structured failures from `error`.

Examples:

```json
{
  "data": {
    "ok": true
  },
  "error": null
}
```

```json
{
  "data": null,
  "error": {
    "code": "invalid_webhook_secret",
    "message": "invalid webhook secret"
  }
}
```

The README will document the common response contract and call out the
breaking change for API consumers.

## Testing

Backend router tests will verify:

- A representative success response wraps an entity in `data`.
- A representative collection wraps an array in `data`.
- API route fallback returns the structured `not_found` envelope.
- Missing session, invalid Agent Token, and invalid webhook secret responses
  use the structured error envelope.
- Existing human and commit workflow assertions unwrap `data`.

Frontend tests will verify:

- `request<T>()` returns unwrapped `data` for successful responses.
- Error messages come from `error.message`.
- A `401` on a protected route redirects to `/login`.
- A `401` while already on `/login` does not trigger another redirect.

## Non-Goals

- Adding pagination.
- Changing domain entity field names.
- Versioning the API.
- Maintaining a legacy response mode.
- Adding a client SDK.
