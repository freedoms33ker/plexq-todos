---
id: todo-list
title: TODO list — API endpoints and user interface for managing TODO items
type: feature
status: in-progress
parent: none
functional-area: todo-management
depends-on: []
created: 2026-11-17
updated: 2026-11-17
---

# Feature: TODO list

## Definition

### Problem

There is no way to record and track TODO items. The user wants a local web app with a real HTTP API
behind it, built to the plexq-ai-resources conventions.

### Goals

- A JSON HTTP API that creates, lists, fetches, updates, and deletes TODO items, persisted in PostgreSQL 18.
- A browser UI where every API capability is reachable: add, edit title/notes, mark complete or
  incomplete, delete, and filter by all / active / completed.
- Both sides compile against one shared contract.
- Every behavior is proven by tests that run against a real database and a real running server.

### Solution summary

A pnpm + turbo monorepo with three workspaces:

- `packages/contract` — Effect `HttpApi` definition and Schemas (DTOs, errors).
- `apps/api` — Effect HTTP server implementing the contract with the layered model from
  `.agents/guidance/api-servers.md`: Controller (handlers) → Business Logic Service → Repository,
  with explicit Transformers between DTO, Application Model, and Entity Model.
- `apps/web` — React 19 + Vite SPA using TanStack Router, TanStack Query, the Effect-derived typed
  client, Tailwind, and i18next.

### Out of scope

- Authentication and per-user data (single local user).
- Aggregates, projections, and the optional DataService layer — a TODO item is a single
  unversioned entity with no relations, so the core layers are sufficient (`api-servers.md`:
  optional pieces are added only when the problem warrants them).
- Ordering by drag-and-drop, due dates, tags.

### Acceptance criteria

- AC-01: All three stories below reach `complete:code-complete` with passing acceptance ledgers.
- AC-02: From a fresh clone, `docker compose up -d`, `pnpm install`, `pnpm db:migrate`, and `pnpm dev` start a working app at `http://localhost:5173`.

## Phases

### Phase I — Initial build · in-progress · 2026-11-17

Status 2026-11-17: `todo-api` and `todo-ui` are `complete:code-complete`. `workspace-foundation` is waiting only on its AC-04 container check on the Mac, which is also feature AC-02's first step.


1. [`workspace-foundation`](./workspace-foundation.md) — monorepo, toolchain, database, migrations, shared contract.
2. [`todo-api`](./todo-api.md) — CRUD endpoints, service, repository, CSRF protection, integration tests.
3. [`todo-ui`](./todo-ui.md) — the React SPA and an end-to-end browser test.

## Plan

### Approach

Build bottom-up so each story is testable on its own: the contract and schema first, then the server
against a real database, then the UI against the real server.

### Cross-story contracts

- **The API contract** (`packages/contract/src/api.ts`) is the seam between `todo-api` and `todo-ui`.
  Paths: `GET /api/todos`, `GET /api/todos/:id`, `POST /api/todos`, `PATCH /api/todos/:id`,
  `DELETE /api/todos/:id`, `GET /api/csrf`, `GET /api/health`.
- **CSRF**: double-submit cookie. `GET /api/csrf` sets a `csrf_token` cookie and returns the same
  token; every `POST`/`PATCH`/`PUT`/`DELETE` must send it back in the `x-csrf-token` header or the
  server answers `403`.
- **Delete is a soft delete**: `deleted_timestamp` is set; deleted items are invisible to every read.

### Risks

- Effect's HTTP and SQL packages are pre-1.0 and move quickly; versions are pinned to the Effect v3
  era (`.agents/frameworks/effect/effect.md`: "Use the latest era (currently v3)").
