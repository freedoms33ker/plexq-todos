import { type TodoItem, todoTitleMaxLength } from "@todo/contract"
import { type FormEvent, type KeyboardEvent, type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../../common/components/ui/button.tsx"
import { TextArea, TextInput } from "../../common/components/ui/text-input.tsx"
import { useUpdateTodo } from "../lib/todo-queries.ts"

export interface TodoEditFormProps {
  todo: TodoItem
  onDone: () => void
}

// Initialised from the item once; the owner remounts it with a `key` instead of syncing props into state.
export const TodoEditForm = ({ todo, onDone }: TodoEditFormProps): ReactElement => {
  const { t } = useTranslation()
  const updateTodo = useUpdateTodo()
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? "")

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    updateTodo.mutate({ id: todo.id, changes: { title, notes: notes.trim() === "" ? null : notes.trim() } }, { onSuccess: onDone })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key === "Escape") {
      onDone()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className="flex flex-1 flex-col gap-2"
      aria-label={t("todos.edit.label", { title: todo.title })}
    >
      <TextInput
        aria-label={t("todos.edit.titleLabel")}
        maxLength={todoTitleMaxLength}
        value={title}
        onChange={event => setTitle(event.target.value)}
        autoFocus
      />
      <TextArea
        aria-label={t("todos.edit.notesLabel")}
        placeholder={t("todos.form.notesPlaceholder")}
        rows={2}
        value={notes}
        onChange={event => setNotes(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {t("todos.edit.cancel")}
        </Button>
        <Button type="submit" variant="primary" disabled={title.trim() === "" || updateTodo.isPending}>
          {t("todos.edit.save")}
        </Button>
      </div>
    </form>
  )
}
