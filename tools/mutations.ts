export interface Mutation {
  name: string
  story: "workspace-foundation" | "todo-api" | "todo-ui"
  file: string
  find: string
  replace: string
  command: string
}

const apiSpec = (filter: string): string => `pnpm --filter @todo/api exec vitest run src/todo/todo.api.spec.ts -t "${filter}"`
const webSpec = (file: string): string => `pnpm --filter @todo/web exec vitest run ${file}`

export const mutations: ReadonlyArray<Mutation> = [
  {
    name: "migration-drops-uuidv7-default",
    story: "workspace-foundation",
    file: "apps/api/src/datastore/core/migrations/0001_create_todo_item.ts",
    find: "primary key default uuidv7()",
    replace: "primary key default gen_random_uuid()",
    command: "pnpm --filter @todo/api exec vitest run src/datastore/core/migrator.spec.ts"
  },
  {
    name: "migrations-rerun-without-tracking",
    story: "workspace-foundation",
    file: "apps/api/src/datastore/core/migrator.ts",
    find: "export const runMigrations = PgMigrator.run({ loader: migrationLoader })",
    replace:
      'export const runMigrations = createTodoItem.pipe(Effect.as([[1, "create_todo_item"] as const]))\nimport { Effect } from "effect"',
    command: "pnpm --filter @todo/api exec vitest run src/datastore/core/migrator.spec.ts"
  },
  {
    name: "contract-loses-404-status",
    story: "workspace-foundation",
    file: "packages/contract/src/todo/todo.model.ts",
    find: "HttpApiSchema.annotations({ status: 404 })",
    replace: "HttpApiSchema.annotations({ status: 500 })",
    command: apiSpec("AC-06")
  },
  {
    name: "title-not-trimmed",
    story: "todo-api",
    file: "packages/contract/src/todo/todo.model.ts",
    find: "export const TodoTitle = Schema.Trim.pipe(",
    replace: "export const TodoTitle = Schema.String.pipe(",
    command: apiSpec("AC-01|AC-02")
  },
  {
    name: "list-includes-deleted",
    story: "todo-api",
    file: "apps/api/src/todo/todo.repository.ts",
    find: "sql`select * from todo_item where deleted_timestamp is null order by created_timestamp, id`",
    replace: "sql`select * from todo_item order by created_timestamp, id`",
    command: apiSpec("AC-03")
  },
  {
    name: "list-newest-first",
    story: "todo-api",
    file: "apps/api/src/todo/todo.repository.ts",
    find: "order by created_timestamp, id`",
    replace: "order by created_timestamp desc, id`",
    command: apiSpec("AC-03")
  },
  {
    name: "patch-does-not-advance-updated-timestamp",
    story: "todo-api",
    file: "apps/api/src/todo/todo.repository.ts",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: matches literal source text containing a template placeholder
    find: "${sql.update(changes)}, updated_timestamp = clock_timestamp()",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: matches literal source text containing a template placeholder
    replace: "${sql.update(changes)}",
    command: apiSpec("AC-04")
  },
  {
    name: "patch-overwrites-unsupplied-notes",
    story: "todo-api",
    file: "apps/api/src/todo/todo.service.ts",
    find: "notes: request.notes === undefined ? current.notes : request.notes,",
    replace: "notes: request.notes ?? null,",
    command: apiSpec("AC-04")
  },
  {
    name: "hard-delete-instead-of-soft",
    story: "todo-api",
    file: "apps/api/src/todo/todo.repository.ts",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: matches literal source text containing a template placeholder
    find: "sql`update todo_item set deleted_timestamp = clock_timestamp(), updated_timestamp = clock_timestamp() where id = ${id} and deleted_timestamp is null returning id`",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: matches literal source text containing a template placeholder
    replace: "sql`delete from todo_item where id = ${id} returning id`",
    command: apiSpec("AC-05")
  },
  {
    name: "missing-id-returns-500",
    story: "todo-api",
    file: "packages/contract/src/todo/todo.model.ts",
    find: "HttpApiSchema.annotations({ status: 404 })",
    replace: "HttpApiSchema.annotations({ status: 500 })",
    command: apiSpec("AC-06")
  },
  {
    name: "csrf-middleware-disabled",
    story: "todo-api",
    file: "apps/api/src/csrf/csrf.middleware.ts",
    find: "if (isMissingValidToken(request)) {",
    replace: "if (false && isMissingValidToken(request)) {",
    command: apiSpec("AC-07")
  },
  {
    name: "fixture-cleanup-wipes-table",
    story: "todo-api",
    file: "apps/api/src/tests/todo-fixture.provider.ts",
    find: "repository.purge(id)",
    replace: "repository.purge(id).pipe(Effect.zipRight(Effect.flatMap(SqlClient.SqlClient, sql => sql`delete from todo_item`)))",
    command: apiSpec("AC-08")
  },
  {
    name: "logger-drops-env",
    story: "todo-api",
    file: "apps/api/src/common/logger.ts",
    find: 'defaultMeta: { env: config.env, service: "todo-api" },',
    replace: 'defaultMeta: { service: "todo-api" },',
    command: "pnpm --filter @todo/api exec vitest run src/common/logger.spec.ts"
  },
  {
    name: "active-filter-wrong",
    story: "todo-ui",
    file: "apps/web/src/todos/lib/todo-filters.ts",
    find: "active: todo => !todo.completed,",
    replace: "active: todo => todo.completed,",
    command: webSpec("src/todos/lib/todo-filters.spec.ts")
  },
  {
    name: "hardcoded-aria-label",
    story: "todo-ui",
    file: "apps/web/src/todos/components/TodoRow.tsx",
    find: 'aria-label={t("todos.row.edit", { title: todo.title })}',
    replace: 'aria-label="Edit"',
    command: webSpec("src/i18n-coverage.spec.ts")
  },
  {
    name: "hardcoded-jsx-text",
    story: "todo-ui",
    file: "apps/web/src/todos/components/TodoForm.tsx",
    find: '{t("todos.form.add")}',
    replace: "Add",
    command: webSpec("src/i18n-coverage.spec.ts")
  },
  {
    name: "missing-translation-key",
    story: "todo-ui",
    file: "apps/web/src/i18n.ts",
    find: '      add: "Add"\n',
    replace: "",
    command: webSpec("src/i18n-coverage.spec.ts")
  },
  {
    name: "delete-button-not-wired",
    story: "todo-ui",
    file: "apps/web/src/todos/components/TodoRow.tsx",
    find: "onClick={() => deleteTodo.mutate(todo.id)}",
    replace: "onClick={() => undefined}",
    command: 'pnpm --filter @todo/web exec playwright test -g "AC-05"'
  }
]
