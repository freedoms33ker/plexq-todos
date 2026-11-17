import { Schema } from "effect"

export const TodoItemEntity = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String,
  notes: Schema.NullOr(Schema.String),
  is_completed: Schema.Boolean,
  is_test_data: Schema.Boolean,
  created_timestamp: Schema.DateFromSelf,
  updated_timestamp: Schema.DateFromSelf,
  deleted_timestamp: Schema.NullOr(Schema.DateFromSelf)
})
export type TodoItemEntity = typeof TodoItemEntity.Type

export const TodoItemInsert = Schema.Struct({
  title: Schema.String,
  notes: Schema.NullOr(Schema.String),
  is_completed: Schema.Boolean,
  is_test_data: Schema.Boolean
})
export type TodoItemInsert = typeof TodoItemInsert.Type

export const TodoItemChanges = Schema.Struct({
  title: Schema.String,
  notes: Schema.NullOr(Schema.String),
  is_completed: Schema.Boolean
})
export type TodoItemChanges = typeof TodoItemChanges.Type
