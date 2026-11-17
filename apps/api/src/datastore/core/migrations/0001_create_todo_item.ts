import { SqlClient } from "@effect/sql"
import { Effect } from "effect"

export const createTodoItem = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`
    create table todo_item (
      id                uuid        primary key default uuidv7(),
      title             text        not null check (length(btrim(title)) between 1 and 200),
      notes             text,
      is_completed      boolean     not null default false,
      is_test_data      boolean     not null default false,
      created_timestamp timestamptz not null default now(),
      updated_timestamp timestamptz not null default now(),
      deleted_timestamp timestamptz default null
    )
  `
  yield* sql`create index todo_item_active_created_i on todo_item (created_timestamp, id) where deleted_timestamp is null`
})
