---
id: system
title: TODO App
type: system
created: 2026-11-17
updated: 2026-11-17
---

# System: TODO App

## Vision

A small, complete, full-stack TODO application that a single person can run locally to create, edit,
complete, and delete TODO items. It exists as a working reference for building a product end-to-end
with the plexq-ai-resources guidance and planning workflow: plan files drive the work, every story
carries an acceptance-contract ledger, and the code follows the shared constitution
(`.agents/general.md`, `.agents/formatting.md`, the TypeScript/Effect/React guides).

## Scope boundary

In this repo:

- The TODO HTTP API (create, read, list, update, delete) and its PostgreSQL schema.
- The browser UI that drives that API.
- The shared API contract both sides compile against.

Not in this repo (and not planned yet):

- User accounts, authentication, multi-user sharing.
- Deployment environments beyond `local`.
- A PM tool. Plan files are the only planning record; `ticket-id`, `pm-tool`, and `pm-record` stay empty.

## Key cross-cutting context

- One developer, one Mac, run locally with Docker providing PostgreSQL 18.
- The API contract is defined once and imported by both the server and the browser client, so a
  contract change is a compile error on both sides rather than a runtime surprise.

## Functional areas

| Area | Features | Capability it owns |
| :--- | :--- | :--- |
| `todo-management` | [`todo-list`](./todo-list/feature.md) | Creating, viewing, editing, completing, and deleting TODO items through the API and UI |

## Links

- Guidance source: `~/Repositories/plexq-ai-resources` (linked into `.agents/` and `.claude/` by `bin/link-ai.sh`)
- Machine setup plan: [`docs/plexq-ai-resources-machine-setup.md`](../../docs/plexq-ai-resources-machine-setup.md)
