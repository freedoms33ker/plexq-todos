import { randomUUID } from "node:crypto"
import { SqlClient } from "@effect/sql"
import { TodoId, type TodoItem } from "@todo/contract"
import { Effect, Schema } from "effect"
import { TodoItemEntity, type TodoItemInsert } from "../todo/todo.entity.ts"
import { TodoRepository } from "../todo/todo.repository.ts"
import type { FixtureManager } from "./fixture-manager.ts"
import type { TestServer } from "./test-server.ts"

export class TodoFixtureProvider {
  constructor(
    public server: TestServer,
    public fixtures: FixtureManager
  ) {}

  createTodo = async (overrides: Partial<TodoItemInsert> = {}): Promise<TodoItem> =>
    this.trackTodo(
      await this.server.runtime.runPromise(Effect.flatMap(TodoRepository, repository => repository.insert(this.buildTodo(overrides))))
    )

  // Rows the API created during a test are registered too, so they are removed by id like any fixture.
  trackTodo = (item: TodoItem): TodoItem => this.fixtures.register({ value: item, cleanupThunk: () => this.purge(item.id) })

  trackTodoId = (id: string): void => {
    this.fixtures.register({ value: { id }, cleanupThunk: () => this.purge(TodoId.make(id)) })
  }

  buildTodo = (overrides: Partial<TodoItemInsert>): TodoItemInsert => ({
    title: `Fixture TODO ${randomUUID().slice(0, 8)}`,
    notes: null,
    is_completed: false,
    is_test_data: true,
    ...overrides
  })

  // Reads the stored row directly, including soft-deleted rows, so tests can assert database state.
  findStoredRow = async (id: string): Promise<TodoItemEntity | undefined> =>
    this.server.runtime.runPromise(
      SqlClient.SqlClient.pipe(
        Effect.flatMap(sql => sql`select * from todo_item where id = ${id}`),
        Effect.flatMap(rows => Schema.decodeUnknown(Schema.Array(TodoItemEntity))(rows)),
        Effect.map(rows => rows[0]),
        Effect.orDie
      )
    )

  // A snapshot of every stored id, deleted rows included. Comparing snapshots proves "no row was written"
  // without relying on clock precision.
  storedIds = async (): Promise<ReadonlySet<string>> =>
    this.server.runtime.runPromise(
      SqlClient.SqlClient.pipe(
        Effect.flatMap(sql => sql<{ id: string }>`select id from todo_item`),
        Effect.map(rows => new Set(rows.map(row => row.id))),
        Effect.orDie
      )
    )

  newIdsSince = async (before: ReadonlySet<string>): Promise<ReadonlyArray<string>> =>
    [...(await this.storedIds())].filter(id => !before.has(id))

  // Compared in SQL at microsecond precision; the API's millisecond timestamps can tie for a fast update.
  wasUpdatedAfterCreation = async (id: string): Promise<boolean> =>
    this.server.runtime.runPromise(
      SqlClient.SqlClient.pipe(
        Effect.flatMap(
          sql => sql<{ advanced: boolean }>`select updated_timestamp > created_timestamp as advanced from todo_item where id = ${id}`
        ),
        Effect.map(rows => rows[0]?.advanced === true),
        Effect.orDie
      )
    )

  purge = async (id: TodoId): Promise<void> =>
    this.server.runtime.runPromise(Effect.flatMap(TodoRepository, repository => repository.purge(id)).pipe(Effect.orDie))
}
