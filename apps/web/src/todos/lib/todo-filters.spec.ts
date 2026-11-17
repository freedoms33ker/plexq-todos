import { TodoId, TodoItem } from "@todo/contract"
import { DateTime } from "effect"
import { describe, expect, it } from "vitest"
import { countActiveTodos, filterTodos, parseTodoFilter } from "./todo-filters.ts"

const todo = (id: string, completed: boolean): TodoItem =>
  TodoItem.make({
    id: TodoId.make(`01a1eba2-66d8-71a3-910a-6427292f32b${id}`),
    title: `Todo ${id}`,
    notes: null,
    completed,
    createdTimestamp: DateTime.unsafeMake("2026-11-17T10:00:00Z"),
    updatedTimestamp: DateTime.unsafeMake("2026-11-17T10:00:00Z")
  })

const todos = [todo("1", false), todo("2", true), todo("3", false)]

describe("filterTodos", () => {
  it("returns everything for all, in the original order", () => {
    expect(filterTodos(todos, "all").map(item => item.title)).toEqual(["Todo 1", "Todo 2", "Todo 3"])
  })

  it("returns only incomplete items for active", () => {
    expect(filterTodos(todos, "active").map(item => item.title)).toEqual(["Todo 1", "Todo 3"])
  })

  it("returns only completed items for completed", () => {
    expect(filterTodos(todos, "completed").map(item => item.title)).toEqual(["Todo 2"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(filterTodos([todo("4", false)], "completed")).toEqual([])
  })
})

describe("countActiveTodos", () => {
  it("counts the items that are not completed", () => {
    expect(countActiveTodos(todos)).toBe(2)
    expect(countActiveTodos([])).toBe(0)
  })
})

describe("parseTodoFilter", () => {
  it.each(["all", "active", "completed"])("accepts %s", value => {
    expect(parseTodoFilter(value)).toBe(value)
  })

  it.each([undefined, "", "done", 3, null])("falls back to all for %s", value => {
    expect(parseTodoFilter(value)).toBe("all")
  })
})
