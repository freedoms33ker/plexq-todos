import { useMutationState, useQueryClient } from "@tanstack/react-query"
import type { TodoItem } from "@todo/contract"
import { ListTodo } from "lucide-react"
import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { ErrorBanner } from "../common/components/ErrorBanner.tsx"
import type { ApiFailure } from "../common/lib/api-client.ts"
import { TodoFilterBar } from "./components/TodoFilterBar.tsx"
import { TodoForm } from "./components/TodoForm.tsx"
import { TodoRow } from "./components/TodoRow.tsx"
import { countActiveTodos, filterTodos, type TodoFilter } from "./lib/todo-filters.ts"
import { useTodos } from "./lib/todo-queries.ts"

export interface TodoPageProps {
  filter: TodoFilter
}

export const TodoPage = ({ filter }: TodoPageProps): ReactElement => {
  const { t } = useTranslation()
  const todos = useTodos()
  const all = todos.data ?? []
  const visible = filterTodos(all, filter)

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10 sm:py-16">
      <header className="flex items-center gap-2">
        <ListTodo className="h-6 w-6 text-accent" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("app.title")}</h1>
      </header>
      <TodoForm />
      <MutationErrors />
      {todos.isError ? (
        <p role="alert" className="text-sm text-danger">
          {t(`errors.${todos.error.kind}`)}
        </p>
      ) : null}
      <section aria-label={t("todos.list.label")} className="flex flex-col gap-3">
        <TodoFilterBar current={filter} activeCount={countActiveTodos(all)} />
        <TodoList
          todos={visible}
          isLoading={todos.isPending}
          emptyMessage={t(all.length === 0 ? "todos.list.empty" : `todos.list.emptyFiltered.${filter}`)}
        />
      </section>
    </main>
  )
}

interface TodoListProps {
  todos: ReadonlyArray<TodoItem>
  isLoading: boolean
  emptyMessage: string
}

const TodoList = ({ todos, isLoading, emptyMessage }: TodoListProps): ReactElement => {
  const { t } = useTranslation()
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-ink-muted">{t("todos.list.loading")}</p>
  } else if (todos.length === 0) {
    return <p className="rounded-lg border border-dashed border-line py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>
  } else {
    return (
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        {todos.map(todo => (
          <TodoRow key={todo.id} todo={todo} />
        ))}
      </ul>
    )
  }
}

// Every failed create/update/delete surfaces here until dismissed, so no failure is silent.
const MutationErrors = (): ReactElement | null => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const failures = useMutationState<ApiFailure | null>({
    filters: { status: "error" },
    select: mutation => mutation.state.error as ApiFailure | null
  })
  const latest = failures.at(-1)
  const dismiss = (): void => {
    queryClient
      .getMutationCache()
      .findAll({ status: "error" })
      .forEach(mutation => {
        queryClient.getMutationCache().remove(mutation)
      })
  }
  return latest === undefined || latest === null ? null : (
    <ErrorBanner message={t(`errors.${latest.kind}`)} dismissLabel={t("errors.dismiss")} onDismiss={dismiss} />
  )
}
