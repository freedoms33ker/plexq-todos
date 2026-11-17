---
id: todo-ui
title: TODO UI — React SPA for managing TODO items
type: story
status: complete:code-complete
parent: ./feature.md
branch: main
created: 2026-11-17
updated: 2026-11-17
started: 2026-11-17
completed: 2026-11-17
---

# Story: TODO UI

## Definition

### User story
As the person using the TODO app
I want a web page where I can add, edit, complete, filter, and delete my TODO items
So that I can manage my list without touching the API directly.

### Acceptance criteria
- AC-01: Opening `http://localhost:5173` shows the TODO items loaded from the API, and an empty-state message when there are none.
- AC-02: Entering a title (and optional notes) and pressing Add creates the item through the API and shows it without a page reload, and the Add button is disabled while the title is blank.
- AC-03: Ticking an item's checkbox marks it completed and shows it struck through, unticking marks it active, and both persist through the API.
- AC-04: Editing an item's title or notes and pressing Save persists the change, while Cancel or the Escape key discards it.
- AC-05: Deleting an item removes it from the list once the API confirms the delete.
- AC-06: The All, Active, and Completed filters show the matching items, and a counter shows how many items are still active.
- AC-07: When an API call fails, the page shows a readable error message instead of failing silently.
- AC-08: All user-facing text, including aria-labels and placeholders, comes from i18next translation keys, and every icon-only button has an aria-label.
- AC-09: A Playwright end-to-end test drives AC-01 through AC-06 in a real browser against the real API and database.

### Notes / Open questions
- The Vite dev server proxies `/api` to the API on port 3000, so the browser sees one origin and the CSRF cookie works without CORS.

## Plan

### Architectural constraints
- `frameworks/react/react.md` must-includes: React 19, TanStack Router, Vite, Vitest, TanStack Query, Effect for HTTP/schema in the SPA. Optional, used here: i18next, Tailwind, shadcn-style `Button` with `class-variance-authority` + `cn`.
- No raw `useEffect`: data loading goes through TanStack Query; the edit form resets by remounting with a `key`.
- One `Button` primitive with variants; icon-only buttons carry `aria-label`; primitives never call `t()`.
- `code-file-organization.md`: feature-first folders — `src/todos/{TodoPage.tsx,components/,lib/}`, shared bits in `src/common/`.

### Files to create
- `apps/web/{index.html,vite.config.ts,playwright.config.ts}`
- `src/{main.tsx,router.tsx,i18n.ts,styles.css}`
- `src/common/{components/ui/button.tsx,components/ui/text-input.tsx,lib/cn.ts,lib/api-client.ts}`
- `src/todos/{TodoPage.tsx,components/TodoForm.tsx,components/TodoRow.tsx,components/TodoFilterBar.tsx,lib/todo-queries.ts,lib/todo-filters.ts,lib/todo-filters.spec.ts}`
- `e2e/todos.e2e.ts`

### Step-by-step tasks
1. Vite + React + Tailwind + Router scaffold. VALIDATE: `pnpm --filter @todo/web build`.
2. Typed API client from the shared contract, with CSRF token handling. VALIDATE: typecheck.
3. Query/mutation hooks and pure filter helpers. VALIDATE: `pnpm --filter @todo/web test`.
4. Page and components. VALIDATE: manual run.
5. Playwright e2e. VALIDATE: `pnpm --filter @todo/web test:e2e`.

### Testing strategy
- Unit: `todo-filters.spec.ts` (filtering and the active counter are pure functions).
- End-to-end: `e2e/todos.e2e.ts` runs the real API, real database, and the Vite app in Chromium.

### Validation commands
`pnpm --filter @todo/web test`, `pnpm --filter @todo/web test:e2e`, `pnpm typecheck`, `pnpm lint`.
