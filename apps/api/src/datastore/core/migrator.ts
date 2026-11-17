import { PgMigrator } from "@effect/sql-pg"
import { createTodoItem } from "./migrations/0001_create_todo_item.ts"

export const migrationLoader = PgMigrator.fromRecord({
  "0001_create_todo_item": createTodoItem
})

export const runMigrations = PgMigrator.run({ loader: migrationLoader })
