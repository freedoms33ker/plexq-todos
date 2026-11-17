---
id: todo-api
title: TODO API — create, read, list, update, and delete endpoints
type: story
status: complete:code-complete
parent: ./feature.md
branch: main
created: 2026-11-17
updated: 2026-11-17
started: 2026-11-17
completed: 2026-11-17
---

# Story: TODO API

## Definition

### User story
As a client of the TODO app (the web UI, or a developer with curl)
I want JSON endpoints to create, list, fetch, update, and delete TODO items
So that TODO items are stored durably and every change is validated.

### Acceptance criteria
- AC-01: `POST /api/todos` with a valid title returns `201` and the created item with a UUIDv7 `id`, the trimmed `title`, `notes` (or `null`), `completed: false`, and ISO-8601 timestamps, and the row exists in `todo_item`.
- AC-02: `POST /api/todos` with a missing, empty, whitespace-only, or longer-than-200-character title returns `400` and writes no row.
- AC-03: `GET /api/todos` returns every non-deleted item ordered oldest first, and `GET /api/todos/:id` returns that one item.
- AC-04: `PATCH /api/todos/:id` changes only the supplied fields (`title`, `notes`, `completed`), leaves the others unchanged, advances `updatedTimestamp`, and returns the updated item, and an invalid title returns `400` and changes nothing.
- AC-05: `DELETE /api/todos/:id` returns `204`, sets `deleted_timestamp` on the row without removing it, and the item no longer appears in the list or in a get by id.
- AC-06: `GET`, `PATCH`, or `DELETE` for an id that does not exist or is already deleted returns `404` with a `TodoNotFound` body, and a malformed id returns `400`.
- AC-07: A `POST`, `PATCH`, or `DELETE` request without an `x-csrf-token` header matching the `csrf_token` cookie returns `403` and changes nothing, and `GET /api/csrf` issues that token.
- AC-08: Integration tests run against a real PostgreSQL 18 database through a real HTTP server, create their data through a fixture provider registered with a `FixtureManager`, and clean up only the rows they created, by id.
- AC-09: Log output is JSON from the default winston logger and every line carries an `env` field read from `ENV`.

### Notes / Open questions
- Soft delete matches the standard entity shape (`deleted_timestamp`). Test cleanup is the only hard delete, and it is scoped to one id.

## Plan

### Architectural constraints
- `guidance/api-servers.md` core layers: Controller (`todo.handlers.ts`) → Business Logic Service (`todo.service.ts`) → Repository (`todo.repository.ts`), with Transformers (`todo.transformers.ts`) at the Entity ↔ Application Model boundary. DTO ↔ Application Model is the identity here: the contract's `TodoItem` *is* the application model, so no transform is invented for it.
- Gather → Compute → Persist (`general.md`): `updateTodo` gathers the current item, computes the new state with the pure `applyTodoUpdate`, then persists.
- Expected failures are values, not exceptions (`formatting.md`): `TodoNotFound` is a tagged error in the Effect error channel; repository lookups return `Option`.
- `typescript.md`: no loops into accumulators, `Record` lookups instead of `if/else if` chains, explicit return types, no semicolons.
- `tests.md` / `typescript-testing.md`: vitest, `*.spec.ts` beside the file, fixtures over mocks, `FixtureManager` LIFO cleanup by id, never table-wide deletes.
- `web-ui.md`: SPAs use CSRF tokens → double-submit cookie middleware on the server.

### Files to create
- `apps/api/src/{main.ts,server.ts}`, `config/app-config.ts`, `common/logger.ts`
- `todo/{todo.entity.ts,todo.transformers.ts,todo.repository.ts,todo.service.ts,todo.handlers.ts}` + specs
- `csrf/{csrf.ts,csrf.middleware.ts,csrf.handlers.ts}` + spec, `health/health.handlers.ts`
- `tests/{fixture-manager.ts,todo-fixture.provider.ts,test-server.ts}`

### Step-by-step tasks
1. Config + logger layer. VALIDATE: `pnpm --filter @todo/api test -- logger`.
2. Entity schema, transformers, repository. VALIDATE: transformer unit tests.
3. Service with `applyTodoUpdate` pure function. VALIDATE: unit tests.
4. Handlers + server + CSRF middleware. VALIDATE: integration tests (`todo.api.spec.ts`, `csrf.spec.ts`).
5. `.agents/bin/validate-acceptance-contract.py .agents/plans/todo-list/todo-api.md`.

### Testing strategy
- Unit: `todo.transformers.spec.ts`, `todo.service.spec.ts` (`applyTodoUpdate`), `csrf.spec.ts` (token comparison).
- Integration: `todo.api.spec.ts` starts the real server on an ephemeral port against `todo_test` and drives every endpoint with `fetch`, checking the database state directly for AC-01, AC-02, AC-05, and AC-07.

### Validation commands
`pnpm --filter @todo/api test`, `pnpm typecheck`, `pnpm lint`.
