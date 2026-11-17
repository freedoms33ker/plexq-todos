import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "../../common/components/ui/button.tsx"
import { type TodoFilter, todoFilters } from "../lib/todo-filters.ts"

export interface TodoFilterBarProps {
  current: TodoFilter
  activeCount: number
}

export const TodoFilterBar = ({ current, activeCount }: TodoFilterBarProps): ReactElement => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-ink-muted" aria-live="polite" data-testid="active-count">
        {t("todos.activeCount", { count: activeCount })}
      </p>
      <nav aria-label={t("todos.filters.label")} className="flex gap-1 rounded-lg bg-line/60 p-1">
        {todoFilters.map(filter => (
          <Link
            key={filter}
            to="/"
            search={{ filter }}
            aria-current={filter === current ? "page" : undefined}
            className={buttonVariants({ variant: "segment", size: "xs" })}
          >
            {t(`todos.filters.${filter}`)}
          </Link>
        ))}
      </nav>
    </div>
  )
}
