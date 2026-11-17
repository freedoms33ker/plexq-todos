# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

* For all items in .claude and .agents, follow filesystem symlinks. Adjust any find commands you use here to follow symlinks.
* `.agents/` and `.claude/` are linked in from plexq-ai-resources by `bin/link-ai.sh`. Never stage them, except `.agents/plans/**` (never `.agents/plans/.active`).

## Project Overview

A full-stack TODO app: a JSON HTTP API that creates, lists, fetches, updates, and soft-deletes TODO items in
PostgreSQL 18, and a React SPA that drives it. Plans live in `.agents/plans/` and follow
`.agents/guidance/planning-artifacts.md`.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node 24, pnpm 11, turbo | Runtime, package manager, monorepo task runner |
| TypeScript 6 (strict, `.ts` imports, run natively by Node) | All source |
| Effect 3 (`@effect/platform` HttpApi, `@effect/sql-pg`) | Shared API contract, HTTP server, typed client, schemas, SQL |
| PostgreSQL 18 (Docker) | Storage; `uuidv7()` ids |
| winston | JSON logging; every line carries `env` from `ENV` |
| React 19, Vite 8, TanStack Router + Query, Tailwind 4, i18next | Web UI |
| Vitest, Playwright | Unit/integration tests, browser end-to-end tests |
| Biome | Lint + format (rules from plexq `templates/typescript/biome.json`) |

## Commands

```bash
pnpm db:up              # PostgreSQL 18 in Docker (creates todo + todo_test)
pnpm db:migrate         # migrate the dev database (apps/api/.env)
pnpm dev                # API on :3000 and web on :5173 (Vite proxies /api)
pnpm test               # API unit + integration tests (todo_test) and web unit tests
pnpm test:e2e           # Playwright: real API (:3100) + Vite (:5174) against todo_test
pnpm typecheck
pnpm lint               # pnpm lint:fix to auto-fix
```

## Project Structure

```
packages/contract/   # TodoAppApi (HttpApi) + Schemas + errors — imported by api and web
apps/api/src/
  todo/              # entity, transformers, repository, service, handlers (+ specs)
  csrf/              # double-submit CSRF token + middleware
  datastore/core/    # PgClient layer, migrator, migrations/
  config/ common/    # AppConfig (ENV, PORT, DATABASE_URL, LOG_LEVEL), winston logger
  tests/             # FixtureManager, TodoFixtureProvider, test server, test client
apps/web/src/
  todos/             # TodoPage, components/, lib/ (queries, filters)
  common/            # ui/ primitives (Button, TextInput), lib/ (cn, api-client)
apps/web/e2e/        # Playwright specs + cleanup fixture
.agents/plans/       # system.md, todo-list/feature.md, stories + acceptance ledgers
```

## Architecture

`apps/api` follows `.agents/guidance/api-servers.md` core layers:
handlers (Controller) → `TodoService` (Business Logic: gather → compute → persist) → `TodoRepository`
(SQL), with `todo.transformers.ts` between the Entity Model (`todo_item` row) and the Application Model
(`TodoItem` from the contract). The contract's `TodoItem` doubles as the DTO. No aggregates, projections,
or DataService layer — a TODO is one unversioned entity.

Every `POST`/`PATCH`/`PUT`/`DELETE` needs an `x-csrf-token` header equal to the `csrf_token` cookie
issued by `GET /api/csrf`, or the server answers 403.

## Code Patterns

- Expected failures are values: `TodoNotFound` in the Effect error channel; `Option` from repository lookups. Infrastructure errors become defects (500).
- Delete is soft (`deleted_timestamp`). Only test cleanup hard-deletes, one id at a time.
- UI: data via TanStack Query (no raw `useEffect`); one `Button` with variants; all text via `t()`; icon-only buttons need `aria-label`.

## Testing

- Tests sit beside the file as `*.spec.ts`; e2e specs in `apps/web/e2e/*.e2e.ts`.
- Integration tests hit a real server on an ephemeral port and the real `todo_test` database.
- Persisted test data goes through `FixtureManager` and is removed by id. **Never** `DELETE FROM todo_item`, `TRUNCATE`, or any table-wide cleanup.

## Validation

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
.agents/bin/validate-acceptance-contract.py .agents/plans/todo-list/feature.md
```

## Project management

There is no PM tool. Plan files are the only record. Leave `ticket-id`, `pm-tool`, `pm-record`, and
`pm-url` empty, and reference the plan slug (e.g. `todo-list/todo-api`) in commit messages instead of an
Airtable or Linear ticket.

## On-Demand Context

| Topic | File | Load When |
| :---- | :---- | :---- |
| General Guidance | .agents/general.md | Start of any implementation task |
| Code Formatting | .agents/formatting.md | Writing or modifying any source file |
| Code Object Types | .agents/object-types.md | Defining new classes, interfaces, or types |
| Testing | .agents/tests.md, .agents/languages/typescript/typescript-testing.md | Writing or modifying any test file |
| File organization | .agents/code-file-organization.md | Creating new files or directories |
| Anti-patterns | .agents/anti-patterns-things-considered-harmful.md | Any implementation task |
| TypeScript | .agents/languages/typescript/*.md | Any `.ts`/`.tsx` file |
| Effect | .agents/frameworks/effect/effect.md | Any `.ts`/`.tsx` file |
| Node | .agents/frameworks/node/preferences.md | Adding packages or changing tooling |
| React | .agents/frameworks/react/react.md | Any `.tsx` file |
| SQL / PostgreSQL | .agents/languages/sql/main.md, .agents/languages/sql/postgresql.md | Always (project uses PostgreSQL) |
| API servers | .agents/guidance/api-servers.md | Changing `apps/api` |
| UI | .agents/guidance/web-ui.md | Changing `apps/web` |
| Planning artifacts | .agents/guidance/planning-artifacts.md | Anything under `.agents/plans/` |
