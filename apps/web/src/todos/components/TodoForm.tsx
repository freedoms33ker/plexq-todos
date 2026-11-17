import { todoTitleMaxLength } from "@todo/contract"
import { Plus } from "lucide-react"
import { type FormEvent, type ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../../common/components/ui/button.tsx"
import { TextArea, TextInput } from "../../common/components/ui/text-input.tsx"
import { useCreateTodo } from "../lib/todo-queries.ts"

export const TodoForm = (): ReactElement => {
  const { t } = useTranslation()
  const createTodo = useCreateTodo()
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const isBlank = title.trim() === ""

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    createTodo.mutate({ title, notes }, { onSuccess: () => resetForm() })
  }
  const resetForm = (): void => {
    setTitle("")
    setNotes("")
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-sm"
      aria-label={t("todos.form.label")}
    >
      <TextInput
        aria-label={t("todos.form.titleLabel")}
        placeholder={t("todos.form.titlePlaceholder")}
        maxLength={todoTitleMaxLength}
        value={title}
        onChange={event => setTitle(event.target.value)}
      />
      <TextArea
        aria-label={t("todos.form.notesLabel")}
        placeholder={t("todos.form.notesPlaceholder")}
        rows={2}
        value={notes}
        onChange={event => setNotes(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isBlank || createTodo.isPending}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("todos.form.add")}
        </Button>
      </div>
    </form>
  )
}
