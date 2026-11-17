import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { parseTodoFilter, type TodoFilter } from "./todos/lib/todo-filters.ts"
import { TodoPage } from "./todos/TodoPage.tsx"

const rootRoute = createRootRoute({ component: (): ReactElement => <Outlet /> })

const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): { filter: TodoFilter } => ({ filter: parseTodoFilter(search.filter) }),
  component: function TodosRouteComponent(): ReactElement {
    return <TodoPage filter={todosRoute.useSearch().filter} />
  }
})

export const router = createRouter({ routeTree: rootRoute.addChildren([todosRoute]) })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
