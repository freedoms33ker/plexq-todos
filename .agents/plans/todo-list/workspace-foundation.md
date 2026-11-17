---
id: workspace-foundation
title: Workspace foundation — monorepo, toolchain, PostgreSQL 18, migrations, shared contract
type: story
status: in-progress:in-progress
parent: ./feature.md
branch: main
created: 2026-11-17
updated: 2026-11-17
started: 2026-11-17
---

# Story: Workspace foundation

## Definition

### User story
As the developer of the TODO app
I want a monorepo with the plexq toolchain, a PostgreSQL 18 database with the `todo_item` schema, and one shared API contract
So that the API and UI stories can be built and tested on a working base.

### Acceptance criteria
- AC-01: `pnpm install` at the repo root installs all three workspaces, and every `package.json` declares `engines.node >=24` and the root declares `pnpm >=11`.
- AC-02: `pnpm typecheck` passes for every workspace with TypeScript `strict` and `allowImportingTsExtensions` enabled.
- AC-03: `pnpm lint` runs Biome with the rules from plexq `templates/typescript/biome.json` (no semicolons, double quotes, 140-column lines, `noExplicitAny`, `noConsole`) and reports zero errors.
- AC-04: `docker-compose.yml` runs PostgreSQL 18 and creates both the `todo` and `todo_test` databases.
- AC-05: `pnpm db:migrate` creates the `todo_item` table with `id uuid default uuidv7()`, `title text not null`, `notes text`, `is_completed`, `is_test_data`, `created_timestamp`, `updated_timestamp`, and `deleted_timestamp`, and running it a second time changes nothing.
- AC-06: `packages/contract` exports the `TodoAppApi` definition, the `TodoItem`, `CreateTodoRequest`, and `UpdateTodoRequest` schemas, and the `TodoNotFound` and `CsrfRejected` errors, and both `apps/api` and `apps/web` import from it.

### Notes / Open questions
- **Open (2026-11-17):** AC-04 is the only criterion without direct evidence. The compose file is valid and its init script was proven on PostgreSQL 18.6, but the `postgres:18` container has not been started because Docker Hub was unreachable from the build environment. Run the AC-04 command recorded in `workspace-foundation.acceptance.json` on the Mac, then mark AC-04 `satisfied` and move this story to `complete:code-complete`.
- Docker Hub images are the Mac's source for PostgreSQL 18. Any PostgreSQL 18 reachable through `DATABASE_URL` works.

## Plan

### Architectural constraints
- `node/preferences.md`: TypeScript, pnpm, turbo, Node 24, ESM, Biome, Effect for schema/HTTP/SQL, vitest ≥4.1, `--env-file` instead of dotenv, winston.
- `sql/main.md` + `sql/postgresql.md`: snake_case tables, UUIDv7 ids, standard entity columns, PostgreSQL ≥18, `text` columns, filtered indexes.
- `typescript.md`: `.ts` import extensions, no enums, explicit return types.

### Files to create
- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `tsconfig.base.json`, `docker-compose.yml`, `docker/init-test-db.sql`, `.gitignore`, `CLAUDE.md`, `README.md`, `tools/counterexamples.ts`, `tools/mutations.ts`.
- `apps/api/.env.example`, `apps/api/.env.test.example`.
- `packages/contract/src/{api.ts,index.ts,todo/todo.model.ts,todo/todo.api.ts,csrf/csrf.api.ts,health/health.api.ts}`.
- `apps/api/src/datastore/core/{database.ts,migrator.ts,migrate.ts,migrator.spec.ts,migrations/0001_create_todo_item.ts}`.

### Step-by-step tasks
1. Scaffold the workspace and toolchain. VALIDATE: `pnpm install && pnpm typecheck && pnpm lint`.
2. Add `docker-compose.yml` with `postgres:18` and an init script creating `todo_test`. VALIDATE: `docker compose up -d && psql … -c "select uuidv7()"`.
3. Write migration `0001_create_todo_item` and the `db:migrate` script. VALIDATE: `pnpm db:migrate` twice; `\d todo_item`.
4. Define the contract package. VALIDATE: `pnpm typecheck`.

### Testing strategy
Toolchain criteria are proven by running the commands. Migration idempotence and the exact schema are proven by `migrator.spec.ts`, which creates a brand-new database, migrates it twice, and inspects `information_schema` (the shared test database is already migrated, so it cannot prove this).

### Validation commands
`pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm db:migrate`, `pnpm --filter @todo/api db:migrate:test`.
