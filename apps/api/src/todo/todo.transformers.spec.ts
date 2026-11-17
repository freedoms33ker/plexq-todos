import { CreateTodoRequest, TodoItem } from "@todo/contract"
import { DateTime, Schema } from "effect"
import { describe, expect, it } from "vitest"
import type { TodoItemEntity } from "./todo.entity.ts"
import { todoChangesFromItem, todoInsertFromRequest, todoItemFromEntity } from "./todo.transformers.ts"

const entity: TodoItemEntity = {
  id: "01a1eba2-66d8-71a3-910a-6427292f32b1",
  title: "Water plants",
  notes: null,
  is_completed: true,
  is_test_data: true,
  created_timestamp: new Date("2026-11-17T10:00:00.000Z"),
  updated_timestamp: new Date("2026-11-17T11:30:00.000Z"),
  deleted_timestamp: null
}

describe("todoItemFromEntity", () => {
  it("maps the stored row to the application model and drops storage-only columns", () => {
    const item = todoItemFromEntity(entity)

    expect(item).toBeInstanceOf(TodoItem)
    expect(Schema.encodeSync(TodoItem)(item)).toEqual({
      id: entity.id,
      title: "Water plants",
      notes: null,
      completed: true,
      createdTimestamp: "2026-11-17T10:00:00.000Z",
      updatedTimestamp: "2026-11-17T11:30:00.000Z"
    })
    expect(DateTime.toEpochMillis(item.updatedTimestamp)).toBe(entity.updated_timestamp.getTime())
  })
})

describe("todoInsertFromRequest", () => {
  it("creates an incomplete row and carries the test-data flag", () => {
    const request = Schema.decodeUnknownSync(CreateTodoRequest)({ title: "  Pay rent  " })

    expect(todoInsertFromRequest(request, false)).toEqual({ title: "Pay rent", notes: null, is_completed: false, is_test_data: false })
    expect(todoInsertFromRequest(request, true).is_test_data).toBe(true)
  })
})

describe("todoChangesFromItem", () => {
  it("writes only the user-editable columns", () => {
    expect(todoChangesFromItem(todoItemFromEntity(entity))).toEqual({ title: "Water plants", notes: null, is_completed: true })
  })
})
