import { HttpApiBuilder } from "@effect/platform"
import { TodoAppApi } from "@todo/contract"
import { Effect } from "effect"
import { TodoService } from "./todo.service.ts"

export const TodoHandlersLive = HttpApiBuilder.group(TodoAppApi, "todos", handlers =>
  Effect.gen(function* () {
    const service = yield* TodoService
    return handlers
      .handle("listTodos", () => service.listTodos())
      .handle("getTodo", ({ path }) => service.getTodo(path.id))
      .handle("createTodo", ({ payload }) => service.createTodo(payload))
      .handle("updateTodo", ({ path, payload }) => service.updateTodo(path.id, payload))
      .handle("deleteTodo", ({ path }) => service.deleteTodo(path.id))
  })
)
