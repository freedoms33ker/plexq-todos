import { type QueryClient, type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type TodoId, TodoItem } from "@todo/contract"
import { type ApiFailure, type TodoChanges, type TodoDraft, todoApi } from "../../common/lib/api-client.ts"

export const todosQueryKey = ["todos"] as const

interface TodoUpdate {
  id: TodoId
  changes: TodoChanges
}

interface UpdateContext {
  previous: ReadonlyArray<TodoItem> | undefined
}

export const useTodos = (): UseQueryResult<ReadonlyArray<TodoItem>, ApiFailure> =>
  useQuery({ queryKey: todosQueryKey, queryFn: todoApi.list })

export const useCreateTodo = (): UseMutationResult<TodoItem, ApiFailure, TodoDraft> => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: todoApi.create, onSettled: () => refreshTodos(queryClient) })
}

// Optimistic: the checkbox and edits show immediately, and roll back if the API rejects the change.
export const useUpdateTodo = (): UseMutationResult<TodoItem, ApiFailure, TodoUpdate, UpdateContext> => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }) => todoApi.update(id, changes),
    onMutate: async update => {
      await queryClient.cancelQueries({ queryKey: todosQueryKey })
      const previous = queryClient.getQueryData<ReadonlyArray<TodoItem>>(todosQueryKey)
      queryClient.setQueryData<ReadonlyArray<TodoItem>>(todosQueryKey, current => current?.map(applyLocally(update)))
      return { previous }
    },
    onError: (_failure, _update, context) => queryClient.setQueryData(todosQueryKey, context?.previous),
    onSettled: () => refreshTodos(queryClient)
  })
}

export const useDeleteTodo = (): UseMutationResult<void, ApiFailure, TodoId> => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: todoApi.remove, onSettled: () => refreshTodos(queryClient) })
}

const refreshTodos = (queryClient: QueryClient): Promise<void> => queryClient.invalidateQueries({ queryKey: todosQueryKey })

const applyLocally =
  ({ id, changes }: TodoUpdate) =>
  (todo: TodoItem): TodoItem =>
    todo.id === id ? TodoItem.make({ ...todo, ...changes, title: changes.title?.trim() ?? todo.title }) : todo
