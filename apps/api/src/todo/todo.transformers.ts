import { type CreateTodoRequest, TodoId, TodoItem } from "@todo/contract"
import { DateTime } from "effect"
import type { TodoItemChanges, TodoItemEntity, TodoItemInsert } from "./todo.entity.ts"

export const todoItemFromEntity = (entity: TodoItemEntity): TodoItem =>
  TodoItem.make({
    id: TodoId.make(entity.id),
    title: entity.title,
    notes: entity.notes,
    completed: entity.is_completed,
    createdTimestamp: DateTime.unsafeFromDate(entity.created_timestamp),
    updatedTimestamp: DateTime.unsafeFromDate(entity.updated_timestamp)
  })

export const todoInsertFromRequest = (request: CreateTodoRequest, isTestData: boolean): TodoItemInsert => ({
  title: request.title,
  notes: request.notes,
  is_completed: false,
  is_test_data: isTestData
})

export const todoChangesFromItem = (item: TodoItem): TodoItemChanges => ({
  title: item.title,
  notes: item.notes,
  is_completed: item.completed
})
