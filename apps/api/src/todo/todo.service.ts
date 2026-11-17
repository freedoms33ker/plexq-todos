import { type CreateTodoRequest, type TodoId, TodoItem, TodoNotFound, type UpdateTodoRequest } from "@todo/contract"
import { Effect, Option } from "effect"
import { TodoRepository } from "./todo.repository.ts"
import { todoChangesFromItem, todoInsertFromRequest } from "./todo.transformers.ts"

export class TodoService extends Effect.Service<TodoService>()("TodoService", {
  dependencies: [TodoRepository.Default],
  effect: Effect.gen(function* () {
    const repository = yield* TodoRepository

    const getTodo = (id: TodoId): Effect.Effect<TodoItem, TodoNotFound> =>
      repository.findById(id).pipe(Effect.orDie, Effect.flatMap(requireFound(id)))

    return {
      listTodos: (): Effect.Effect<ReadonlyArray<TodoItem>> => repository.list().pipe(Effect.orDie),
      getTodo,
      createTodo: (request: CreateTodoRequest): Effect.Effect<TodoItem> =>
        repository.insert(todoInsertFromRequest(request, false)).pipe(Effect.orDie, Effect.tap(logTodoEvent("Created TODO item"))),
      updateTodo: (id: TodoId, request: UpdateTodoRequest): Effect.Effect<TodoItem, TodoNotFound> =>
        getTodo(id).pipe(
          Effect.map(current => applyTodoUpdate(current, request)),
          Effect.flatMap(next => repository.update(id, todoChangesFromItem(next)).pipe(Effect.orDie)),
          Effect.flatMap(requireFound(id)),
          Effect.tap(logTodoEvent("Updated TODO item"))
        ),
      deleteTodo: (id: TodoId): Effect.Effect<void, TodoNotFound> =>
        repository.softDelete(id).pipe(
          Effect.orDie,
          Effect.flatMap(deleted =>
            deleted ? Effect.logInfo("Deleted TODO item").pipe(Effect.annotateLogs({ todoId: id })) : Effect.fail(new TodoNotFound({ id }))
          )
        )
    }
  })
}) {}

export const applyTodoUpdate = (current: TodoItem, request: UpdateTodoRequest): TodoItem =>
  TodoItem.make({
    ...current,
    title: request.title ?? current.title,
    notes: request.notes === undefined ? current.notes : request.notes,
    completed: request.completed ?? current.completed
  })

const requireFound =
  (id: TodoId) =>
  (found: Option.Option<TodoItem>): Effect.Effect<TodoItem, TodoNotFound> =>
    Option.match(found, { onNone: () => Effect.fail(new TodoNotFound({ id })), onSome: Effect.succeed })

const logTodoEvent =
  (message: string) =>
  (item: TodoItem): Effect.Effect<void> =>
    Effect.logInfo(message).pipe(Effect.annotateLogs({ todoId: item.id }))
