# TODO App

A full-stack TODO list: an Effect HTTP API on PostgreSQL 18 and a React 19 UI, built to the
[plexq-ai-resources](https://github.com/armtuk/plexq-ai-resources) guidance and planning workflow.

## Prerequisites

Node 24+, pnpm 11+, Docker Desktop (or OrbStack) running.

## Run it

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
pnpm install
pnpm db:up          # PostgreSQL 18 on localhost:5432, databases: todo, todo_test
pnpm db:migrate
pnpm dev            # http://localhost:5173  (API on http://localhost:3000)
```

## Test it

```bash
pnpm test                                    # API unit + integration (real Postgres), web unit
pnpm --filter @todo/web exec playwright install chromium   # first time only
pnpm test:e2e                                # browser end-to-end against the real API
pnpm lint && pnpm typecheck
```

## API

All paths are under `/api`. Mutations need the CSRF header (see below).

| Method | Path | Body | Success | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/todos` | — | `200` `TodoItem[]` (oldest first) | |
| `GET` | `/todos/:id` | — | `200` `TodoItem` | `400` bad id, `404` |
| `POST` | `/todos` | `{ title, notes? }` | `201` `TodoItem` | `400` invalid title, `403` |
| `PATCH` | `/todos/:id` | `{ title?, notes?, completed? }` | `200` `TodoItem` | `400`, `403`, `404` |
| `DELETE` | `/todos/:id` | — | `204` (soft delete) | `400`, `403`, `404` |
| `GET` | `/csrf` | — | `200` `{ token }` + `csrf_token` cookie | |
| `GET` | `/health` | — | `200` `{ status: "ok" }` | |

`TodoItem` is `{ id, title, notes, completed, createdTimestamp, updatedTimestamp }`. Titles are trimmed and
must be 1–200 characters; `notes: null` clears notes.

```bash
curl -c jar -b jar localhost:3000/api/csrf                       # → {"token":"…"}
curl -b jar -H "x-csrf-token: <token>" -H "content-type: application/json" \
  -d '{"title":"Buy milk"}' localhost:3000/api/todos
```

## Using it with plexq-ai-resources

See [`docs/plexq-ai-resources-machine-setup.md`](docs/plexq-ai-resources-machine-setup.md) for the one-time
setup on this Mac, then run `bin/link-ai.sh` from this folder to link the guidance and slash commands.
Plans and acceptance ledgers are in `.agents/plans/todo-list/`.
