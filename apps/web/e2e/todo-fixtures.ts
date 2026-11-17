import { test as base, type Page } from "@playwright/test"
import pg from "pg"

export interface TodoE2eFixtures {
  createdTodoIds: Set<string>
}

// Records every TODO the browser creates and removes exactly those rows, by id, after each test.
export const test = base.extend<TodoE2eFixtures>({
  // auto: every test tracks and cleans up, whether or not it names the fixture.
  createdTodoIds: [
    async ({ page }, use) => {
      const ids = new Set<string>()
      trackCreatedTodos(page, ids)
      await use(ids)
      await purgeTodos([...ids])
    },
    { auto: true }
  ]
})

export { expect } from "@playwright/test"

const trackCreatedTodos = (page: Page, ids: Set<string>): void => {
  page.on("response", async response => {
    if (response.request().method() === "POST" && response.url().endsWith("/api/todos") && response.status() === 201) {
      ids.add(((await response.json()) as { id: string }).id)
    }
  })
}

const purgeTodos = async (ids: string[]): Promise<void> => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://todo:todo@localhost:5432/todo_test" })
  await client.connect()
  await client.query("delete from todo_item where id = any($1::uuid[])", [ids])
  await client.end()
}
