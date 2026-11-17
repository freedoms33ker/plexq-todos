import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { TestApiClient } from "../tests/api-client.ts"
import { FixtureManager } from "../tests/fixture-manager.ts"
import { startTestServer, type TestServer } from "../tests/test-server.ts"
import { TodoFixtureProvider } from "../tests/todo-fixture.provider.ts"

interface TodoBody {
  id: string
  title: string
  notes: string | null
  completed: boolean
  createdTimestamp: string
  updatedTimestamp: string
}

interface CsrfVariant {
  sendCookie: boolean
  header?: string
}

const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const unknownTodoId = "01a1eba2-66d8-71a3-910a-6427292f32b1"

let server: TestServer
let client: TestApiClient
let todos: TodoFixtureProvider
const fixtures = new FixtureManager()

beforeAll(async () => {
  server = await startTestServer()
})

afterAll(async () => {
  await server.dispose()
})

beforeEach(async () => {
  todos = new TodoFixtureProvider(server, fixtures)
  client = new TestApiClient(server.baseUrl)
  await client.fetchCsrfToken()
})

afterEach(async () => {
  await fixtures.cleanUp()
})

const createThroughApi = async (body: unknown): Promise<{ status: number; todo: TodoBody }> => {
  const response = await client.mutate("POST", "/api/todos", body)
  const todo = response.body as TodoBody
  if (response.status === 201) {
    todos.trackTodoId(todo.id)
  }
  return { status: response.status, todo }
}

describe("POST /api/todos", () => {
  it("creates an item with a UUIDv7 id, trimmed title, null notes, not completed, and ISO timestamps, and stores the row (AC-01)", async () => {
    const { status, todo } = await createThroughApi({ title: "   Buy oat milk   " })

    expect(status).toBe(201)
    expect(todo.id).toMatch(uuidV7Pattern)
    expect(todo).toMatchObject({ title: "Buy oat milk", notes: null, completed: false })
    expect(todo.createdTimestamp).toMatch(isoTimestampPattern)
    expect(todo.updatedTimestamp).toMatch(isoTimestampPattern)
    expect(await todos.findStoredRow(todo.id)).toMatchObject({
      id: todo.id,
      title: "Buy oat milk",
      notes: null,
      is_completed: false,
      deleted_timestamp: null
    })
  })

  it("stores notes when they are supplied (AC-01)", async () => {
    const { status, todo } = await createThroughApi({ title: "Call the vet", notes: "Ask about the booster" })

    expect(status).toBe(201)
    expect(todo.notes).toBe("Ask about the booster")
    expect((await todos.findStoredRow(todo.id))?.notes).toBe("Ask about the booster")
  })

  it.each([
    ["a missing title", {}],
    ["an empty title", { title: "" }],
    ["a whitespace-only title", { title: "    " }],
    ["a 201-character title", { title: "x".repeat(201) }],
    ["a non-string title", { title: 42 }]
  ])("rejects %s with 400 and writes no row (AC-02)", async (_label, body) => {
    const before = await todos.storedIds()

    const { status } = await createThroughApi(body)

    expect(status).toBe(400)
    expect(await todos.newIdsSince(before)).toEqual([])
  })

  it("accepts a title of exactly 200 characters (AC-02 boundary)", async () => {
    const { status, todo } = await createThroughApi({ title: "y".repeat(200) })

    expect(status).toBe(201)
    expect(todo.title).toHaveLength(200)
  })
})

describe("GET /api/todos and GET /api/todos/:id", () => {
  it("lists every non-deleted item oldest first and omits deleted ones (AC-03)", async () => {
    const first = await todos.createTodo({ title: "First" })
    const second = await todos.createTodo({ title: "Second" })
    const deleted = await todos.createTodo({ title: "Deleted" })
    await client.mutate("DELETE", `/api/todos/${deleted.id}`)

    const response = await client.get("/api/todos")
    const ids = (response.body as TodoBody[]).map(todo => todo.id)

    expect(response.status).toBe(200)
    expect(ids).toContain(first.id)
    expect(ids).toContain(second.id)
    expect(ids).not.toContain(deleted.id)
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id))
  })

  it("returns a single item by id (AC-03)", async () => {
    const stored = await todos.createTodo({ title: "Fetch me", notes: "by id" })

    const response = await client.get(`/api/todos/${stored.id}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: stored.id, title: "Fetch me", notes: "by id", completed: false })
  })
})

describe("PATCH /api/todos/:id", () => {
  it("changes only the supplied field, advances updatedTimestamp, and returns the updated item (AC-04)", async () => {
    const stored = await todos.createTodo({ title: "Original", notes: "keep me" })

    const response = await client.mutate("PATCH", `/api/todos/${stored.id}`, { completed: true })
    const updated = response.body as TodoBody

    expect(response.status).toBe(200)
    expect(updated).toMatchObject({ id: stored.id, title: "Original", notes: "keep me", completed: true })
    expect(Date.parse(updated.updatedTimestamp)).toBeGreaterThanOrEqual(Date.parse(updated.createdTimestamp))
    expect(await todos.wasUpdatedAfterCreation(stored.id)).toBe(true)
    expect(await todos.findStoredRow(stored.id)).toMatchObject({ title: "Original", notes: "keep me", is_completed: true })
  })

  it("updates title and clears notes when notes is null, trimming the new title (AC-04)", async () => {
    const stored = await todos.createTodo({ title: "Old title", notes: "old notes", is_completed: true })

    const response = await client.mutate("PATCH", `/api/todos/${stored.id}`, { title: "  New title  ", notes: null })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ title: "New title", notes: null, completed: true })
  })

  it("rejects an invalid title with 400 and changes nothing (AC-04)", async () => {
    const stored = await todos.createTodo({ title: "Unchanged" })

    const response = await client.mutate("PATCH", `/api/todos/${stored.id}`, { title: "   ", completed: true })
    const row = await todos.findStoredRow(stored.id)

    expect(response.status).toBe(400)
    expect(row).toMatchObject({ title: "Unchanged", is_completed: false })
    expect(await todos.wasUpdatedAfterCreation(stored.id)).toBe(false)
  })
})

describe("DELETE /api/todos/:id", () => {
  it("returns 204, soft-deletes the row without removing it, and hides it from list and get (AC-05)", async () => {
    const stored = await todos.createTodo({ title: "Delete me" })

    const response = await client.mutate("DELETE", `/api/todos/${stored.id}`)
    const row = await todos.findStoredRow(stored.id)
    const listed = (await client.get("/api/todos")).body as TodoBody[]

    expect(response.status).toBe(204)
    expect(response.body).toBeUndefined()
    expect(row?.deleted_timestamp).toBeInstanceOf(Date)
    expect(listed.map(todo => todo.id)).not.toContain(stored.id)
    expect((await client.get(`/api/todos/${stored.id}`)).status).toBe(404)
  })
})

describe("missing, deleted, and malformed ids", () => {
  it.each([
    ["GET", () => client.get(`/api/todos/${unknownTodoId}`)],
    ["PATCH", () => client.mutate("PATCH", `/api/todos/${unknownTodoId}`, { completed: true })],
    ["DELETE", () => client.mutate("DELETE", `/api/todos/${unknownTodoId}`)]
  ])("%s on an id that does not exist returns 404 TodoNotFound (AC-06)", async (_method, send) => {
    const response = await send()

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ _tag: "TodoNotFound", id: unknownTodoId })
  })

  it("GET, PATCH, and DELETE on an already-deleted id return 404 TodoNotFound (AC-06)", async () => {
    const stored = await todos.createTodo({ title: "Already gone" })
    await client.mutate("DELETE", `/api/todos/${stored.id}`)

    const responses = await Promise.all([
      client.get(`/api/todos/${stored.id}`),
      client.mutate("PATCH", `/api/todos/${stored.id}`, { completed: true }),
      client.mutate("DELETE", `/api/todos/${stored.id}`)
    ])

    expect(responses.map(response => response.status)).toEqual([404, 404, 404])
    expect(responses.map(response => (response.body as { _tag: string })._tag)).toEqual(["TodoNotFound", "TodoNotFound", "TodoNotFound"])
  })

  it.each(["GET", "PATCH", "DELETE"] as const)("%s on a malformed id returns 400 (AC-06)", async method => {
    const response =
      method === "GET"
        ? await client.get("/api/todos/not-a-uuid")
        : await client.mutate(method, "/api/todos/not-a-uuid", { completed: true })

    expect(response.status).toBe(400)
  })
})

describe("CSRF protection", () => {
  it("issues a token in the body and an HttpOnly SameSite=Strict cookie, and reuses a valid cookie (AC-07)", async () => {
    const fresh = await fetch(`${server.baseUrl}/api/csrf`)
    const token = ((await fresh.json()) as { token: string }).token
    const cookie = fresh.headers.get("set-cookie") ?? ""
    const reused = await fetch(`${server.baseUrl}/api/csrf`, { headers: { cookie: `csrf_token=${token}` } })

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(cookie).toContain(`csrf_token=${token}`)
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
    expect(((await reused.json()) as { token: string }).token).toBe(token)
  })

  it.each<[string, CsrfVariant]>([
    ["no header and no cookie", { sendCookie: false }],
    ["a cookie but no header", { sendCookie: true }],
    ["a header that does not match the cookie", { sendCookie: true, header: "A".repeat(43) }]
  ])("rejects POST, PATCH, and DELETE with %s with 403 and changes nothing (AC-07)", async (_label, variant) => {
    const stored = await todos.createTodo({ title: "Guarded" })
    const before = await todos.storedIds()
    const headers = {
      ...(variant.sendCookie ? { cookie: client.cookie } : {}),
      ...(variant.header === undefined ? {} : { "x-csrf-token": variant.header })
    }

    const responses = await Promise.all([
      client.send("POST", "/api/todos", { title: "Should not exist" }, headers),
      client.send("PATCH", `/api/todos/${stored.id}`, { title: "Hacked" }, headers),
      client.send("DELETE", `/api/todos/${stored.id}`, undefined, headers)
    ])

    expect(responses.map(response => response.status)).toEqual([403, 403, 403])
    expect(responses.map(response => (response.body as { _tag: string })._tag)).toEqual(["CsrfRejected", "CsrfRejected", "CsrfRejected"])
    expect(await todos.findStoredRow(stored.id)).toMatchObject({ title: "Guarded", deleted_timestamp: null })
    expect(await todos.newIdsSince(before)).toEqual([])
  })

  it("allows reads without a token (AC-07)", async () => {
    expect((await fetch(`${server.baseUrl}/api/todos`)).status).toBe(200)
  })
})

describe("fixture lifecycle", () => {
  it("removes only the rows this test registered, by id (AC-08)", async () => {
    const local = new FixtureManager()
    const provider = new TodoFixtureProvider(server, local)
    const bystander = await todos.createTodo({ title: "Bystander" })
    const temporary = await provider.createTodo({ title: "Temporary" })

    await local.cleanUp()

    expect(await todos.findStoredRow(temporary.id)).toBeUndefined()
    expect(await todos.findStoredRow(bystander.id)).toMatchObject({ title: "Bystander" })
    expect(local.fixtures).toHaveLength(0)
  })
})
