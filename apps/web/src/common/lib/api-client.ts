import { FetchHttpClient, HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform"
import { CreateTodoRequest, csrfHeaderName, TodoAppApi, type TodoId, type TodoItem, UpdateTodoRequest } from "@todo/contract"
import { Data, Effect, Either, identity, ManagedRuntime, Schema } from "effect"

export const apiFailureKinds = ["notFound", "csrf", "validation", "network", "unexpected"] as const
export type ApiFailureKind = (typeof apiFailureKinds)[number]

export class ApiFailure extends Data.TaggedError("ApiFailure")<{ kind: ApiFailureKind; detail: string }> {}

export interface TodoDraft {
  title: string
  notes: string
}

export interface TodoChanges {
  title?: string
  notes?: string | null
  completed?: boolean
}

type TodoAppClient = Effect.Effect.Success<typeof clientEffect>

export const todoApi = {
  list: (): Promise<ReadonlyArray<TodoItem>> => run(withClient(client => client.todos.listTodos())),
  create: (draft: TodoDraft): Promise<TodoItem> =>
    run(
      Schema.decode(CreateTodoRequest)({ title: draft.title, notes: blankToNull(draft.notes) }).pipe(
        Effect.flatMap(payload => csrfProtected(client => client.todos.createTodo({ payload })))
      )
    ),
  update: (id: TodoId, changes: TodoChanges): Promise<TodoItem> =>
    run(
      Schema.decode(UpdateTodoRequest)(changes).pipe(
        Effect.flatMap(payload => csrfProtected(client => client.todos.updateTodo({ path: { id }, payload })))
      )
    ),
  remove: (id: TodoId): Promise<void> => run(csrfProtected(client => client.todos.deleteTodo({ path: { id } })))
}

// Double-submit CSRF: the server sets an HttpOnly cookie and returns the same token, which we echo in a header.
const csrfToken = { value: "" }

const clientEffect = HttpApiClient.make(TodoAppApi, {
  baseUrl: window.location.origin,
  transformClient: HttpClient.mapRequest(request => HttpClientRequest.setHeader(request, csrfHeaderName, csrfToken.value))
})

const runtime = ManagedRuntime.make(FetchHttpClient.layer)

const withClient = <A, E>(use: (client: TodoAppClient) => Effect.Effect<A, E>): Effect.Effect<A, E, HttpClient.HttpClient> =>
  Effect.flatMap(clientEffect, use)

const refreshCsrfToken = withClient(client => client.csrf.issueCsrfToken()).pipe(Effect.map(response => (csrfToken.value = response.token)))

const ensureCsrfToken = Effect.suspend(() => (csrfToken.value === "" ? refreshCsrfToken : Effect.succeed(csrfToken.value)))

// A rejected token (for example, the cookie was cleared) is refreshed once and the request retried.
const csrfProtected = <A, E>(use: (client: TodoAppClient) => Effect.Effect<A, E>) =>
  ensureCsrfToken.pipe(
    Effect.zipRight(withClient(use)),
    Effect.catchIf(isCsrfRejection, () => refreshCsrfToken.pipe(Effect.zipRight(withClient(use))))
  )

const run = <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>): Promise<A> =>
  runtime.runPromise(Effect.either(Effect.mapError(effect, toApiFailure))).then(Either.getOrThrowWith(identity))

const failureKinds: Partial<Record<string, ApiFailureKind>> = {
  TodoNotFound: "notFound",
  CsrfRejected: "csrf",
  HttpApiDecodeError: "validation",
  ParseError: "validation",
  RequestError: "network"
}

const toApiFailure = (error: unknown): ApiFailure =>
  new ApiFailure({ kind: failureKinds[tagOf(error)] ?? "unexpected", detail: String(error) })

const tagOf = (error: unknown): string => (typeof error === "object" && error !== null && "_tag" in error ? String(error._tag) : "")

const isCsrfRejection = (error: unknown): boolean => tagOf(error) === "CsrfRejected"

const blankToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim())
