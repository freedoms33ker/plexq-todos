import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { CsrfRejected } from "../csrf/csrf.api.ts"
import { CreateTodoRequest, TodoId, TodoItem, TodoNotFound, UpdateTodoRequest } from "./todo.model.ts"

const todoIdParam = HttpApiSchema.param("id", TodoId)

export class TodosApiGroup extends HttpApiGroup.make("todos")
  .add(HttpApiEndpoint.get("listTodos", "/todos").addSuccess(Schema.Array(TodoItem)))
  .add(HttpApiEndpoint.get("getTodo")`/todos/${todoIdParam}`.addSuccess(TodoItem).addError(TodoNotFound))
  .add(
    HttpApiEndpoint.post("createTodo", "/todos").setPayload(CreateTodoRequest).addSuccess(TodoItem, { status: 201 }).addError(CsrfRejected)
  )
  .add(
    HttpApiEndpoint.patch("updateTodo")`/todos/${todoIdParam}`
      .setPayload(UpdateTodoRequest)
      .addSuccess(TodoItem)
      .addError(TodoNotFound)
      .addError(CsrfRejected)
  )
  .add(
    HttpApiEndpoint.del("deleteTodo")`/todos/${todoIdParam}`
      .addSuccess(HttpApiSchema.NoContent)
      .addError(TodoNotFound)
      .addError(CsrfRejected)
  ) {}
