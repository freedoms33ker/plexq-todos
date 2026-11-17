import { TodoId, TodoItem, UpdateTodoRequest } from "@todo/contract"
import { DateTime } from "effect"
import { describe, expect, it } from "vitest"
import { applyTodoUpdate } from "./todo.service.ts"

const current = TodoItem.make({
  id: TodoId.make("01a1eba2-66d8-71a3-910a-6427292f32b1"),
  title: "Write tests",
  notes: "for the service",
  completed: false,
  createdTimestamp: DateTime.unsafeMake("2026-11-17T10:00:00Z"),
  updatedTimestamp: DateTime.unsafeMake("2026-11-17T10:00:00Z")
})

describe("applyTodoUpdate", () => {
  it("returns the item unchanged when the request supplies no fields", () => {
    expect(applyTodoUpdate(current, UpdateTodoRequest.make({}))).toEqual(current)
  })

  it("changes only the supplied fields", () => {
    expect(applyTodoUpdate(current, UpdateTodoRequest.make({ completed: true }))).toEqual(TodoItem.make({ ...current, completed: true }))
  })

  it("clears notes when notes is explicitly null, but keeps them when notes is omitted", () => {
    expect(applyTodoUpdate(current, UpdateTodoRequest.make({ notes: null })).notes).toBeNull()
    expect(applyTodoUpdate(current, UpdateTodoRequest.make({ title: "Renamed" })).notes).toBe("for the service")
  })

  it("never changes identity or timestamps", () => {
    const updated = applyTodoUpdate(current, UpdateTodoRequest.make({ title: "Renamed", notes: "new", completed: true }))

    expect(updated).toMatchObject({
      id: current.id,
      createdTimestamp: current.createdTimestamp,
      updatedTimestamp: current.updatedTimestamp
    })
  })
})
