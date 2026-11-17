import { HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

export const todoTitleMaxLength = 200

export const TodoId = Schema.UUID.pipe(Schema.brand("TodoId"))
export type TodoId = typeof TodoId.Type

export const TodoTitle = Schema.Trim.pipe(
  Schema.nonEmptyString({ message: () => "Title must not be empty" }),
  Schema.maxLength(todoTitleMaxLength, { message: () => `Title must be at most ${todoTitleMaxLength} characters` })
)

export const TodoNotes = Schema.NullOr(Schema.String)

export class TodoItem extends Schema.Class<TodoItem>("TodoItem")({
  id: TodoId,
  title: Schema.String,
  notes: TodoNotes,
  completed: Schema.Boolean,
  createdTimestamp: Schema.DateTimeUtc,
  updatedTimestamp: Schema.DateTimeUtc
}) {}

export class CreateTodoRequest extends Schema.Class<CreateTodoRequest>("CreateTodoRequest")({
  title: TodoTitle,
  notes: Schema.optionalWith(TodoNotes, { default: () => null })
}) {}

export class UpdateTodoRequest extends Schema.Class<UpdateTodoRequest>("UpdateTodoRequest")({
  title: Schema.optional(TodoTitle),
  notes: Schema.optional(TodoNotes),
  completed: Schema.optional(Schema.Boolean)
}) {}

export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()(
  "TodoNotFound",
  { id: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {}
