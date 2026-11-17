import { SqlClient, SqlSchema } from "@effect/sql"
import type { SqlError } from "@effect/sql/SqlError"
import type { TodoId, TodoItem } from "@todo/contract"
import { Effect, Option, type ParseResult, Schema } from "effect"
import { TodoItemChanges, TodoItemEntity, TodoItemInsert } from "./todo.entity.ts"
import { todoItemFromEntity } from "./todo.transformers.ts"

export type RepositoryError = SqlError | ParseResult.ParseError

const TodoItemUpdate = Schema.Struct({ id: Schema.UUID, changes: TodoItemChanges })
const DeletedRow = Schema.Struct({ id: Schema.UUID })

export class TodoRepository extends Effect.Service<TodoRepository>()("TodoRepository", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findActiveRows = SqlSchema.findAll({
      Request: Schema.Void,
      Result: TodoItemEntity,
      execute: () => sql`select * from todo_item where deleted_timestamp is null order by created_timestamp, id`
    })
    const findActiveRowById = SqlSchema.findOne({
      Request: Schema.UUID,
      Result: TodoItemEntity,
      execute: id => sql`select * from todo_item where id = ${id} and deleted_timestamp is null`
    })
    const insertRow = SqlSchema.single({
      Request: TodoItemInsert,
      Result: TodoItemEntity,
      execute: row => sql`insert into todo_item ${sql.insert(row)} returning *`
    })
    const updateActiveRow = SqlSchema.findOne({
      Request: TodoItemUpdate,
      Result: TodoItemEntity,
      execute: ({ id, changes }) =>
        sql`update todo_item set ${sql.update(changes)}, updated_timestamp = clock_timestamp() where id = ${id} and deleted_timestamp is null returning *`
    })
    const softDeleteActiveRow = SqlSchema.findOne({
      Request: Schema.UUID,
      Result: DeletedRow,
      execute: id =>
        sql`update todo_item set deleted_timestamp = clock_timestamp(), updated_timestamp = clock_timestamp() where id = ${id} and deleted_timestamp is null returning id`
    })

    return {
      list: (): Effect.Effect<ReadonlyArray<TodoItem>, RepositoryError> =>
        findActiveRows(undefined).pipe(Effect.map(rows => rows.map(todoItemFromEntity))),
      findById: (id: TodoId): Effect.Effect<Option.Option<TodoItem>, RepositoryError> =>
        findActiveRowById(id).pipe(Effect.map(Option.map(todoItemFromEntity))),
      insert: (row: TodoItemInsert): Effect.Effect<TodoItem, RepositoryError> =>
        insertRow(row).pipe(Effect.catchTag("NoSuchElementException", Effect.die), Effect.map(todoItemFromEntity)),
      update: (id: TodoId, changes: TodoItemChanges): Effect.Effect<Option.Option<TodoItem>, RepositoryError> =>
        updateActiveRow({ id, changes }).pipe(Effect.map(Option.map(todoItemFromEntity))),
      softDelete: (id: TodoId): Effect.Effect<boolean, RepositoryError> => softDeleteActiveRow(id).pipe(Effect.map(Option.isSome)),
      purge: (id: TodoId): Effect.Effect<void, SqlError> => Effect.asVoid(sql`delete from todo_item where id = ${id}`)
    }
  })
}) {}
