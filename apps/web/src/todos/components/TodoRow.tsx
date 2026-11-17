import type { TodoItem } from "@todo/contract"
import { Pencil, Trash2 } from "lucide-react"
import { type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../../common/components/ui/button.tsx"
import { cn } from "../../common/lib/cn.ts"
import { useDeleteTodo, useUpdateTodo } from "../lib/todo-queries.ts"
import { TodoEditForm } from "./TodoEditForm.tsx"

export interface TodoRowProps {
  todo: TodoItem
}

export const TodoRow = ({ todo }: TodoRowProps): ReactElement => {
  const [isEditing, setIsEditing] = useState(false)
  return (
    <li className="flex items-start gap-3 px-4 py-3" data-testid="todo-row">
      {isEditing ? (
        <TodoEditForm key={todo.updatedTimestamp.toString()} todo={todo} onDone={() => setIsEditing(false)} />
      ) : (
        <TodoSummary todo={todo} onEdit={() => setIsEditing(true)} />
      )}
    </li>
  )
}

interface TodoSummaryProps {
  todo: TodoItem
  onEdit: () => void
}

const TodoSummary = ({ todo, onEdit }: TodoSummaryProps): ReactElement => {
  const { t } = useTranslation()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  return (
    <>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent"
        aria-label={t("todos.row.toggle", { title: todo.title })}
        checked={todo.completed}
        disabled={updateTodo.isPending}
        onChange={event => updateTodo.mutate({ id: todo.id, changes: { completed: event.target.checked } })}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("break-words text-sm font-medium text-ink", todo.completed && "text-ink-faint line-through")}>{todo.title}</p>
        {todo.notes === null ? null : (
          <p className={cn("mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-muted", todo.completed && "text-ink-faint")}>
            {todo.notes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" aria-label={t("todos.row.edit", { title: todo.title })} onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          aria-label={t("todos.row.delete", { title: todo.title })}
          disabled={deleteTodo.isPending}
          onClick={() => deleteTodo.mutate(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </>
  )
}
