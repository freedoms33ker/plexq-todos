import type { TodoItem } from "@todo/contract"

export const todoFilters = ["all", "active", "completed"] as const
export type TodoFilter = (typeof todoFilters)[number]

const filterPredicates: Record<TodoFilter, (todo: TodoItem) => boolean> = {
  all: () => true,
  active: todo => !todo.completed,
  completed: todo => todo.completed
}

export const filterTodos = (todos: ReadonlyArray<TodoItem>, filter: TodoFilter): ReadonlyArray<TodoItem> =>
  todos.filter(filterPredicates[filter])

export const countActiveTodos = (todos: ReadonlyArray<TodoItem>): number => todos.filter(filterPredicates.active).length

export const parseTodoFilter = (value: unknown): TodoFilter => todoFilters.find(filter => filter === value) ?? "all"
