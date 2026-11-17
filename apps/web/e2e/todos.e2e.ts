import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { expect, test } from "./todo-fixtures.ts"

const uniqueTitle = (label: string): string => `${label} ${randomUUID().slice(0, 8)}`

const rowFor = (page: Page, title: string) => page.getByTestId("todo-row").filter({ hasText: title })

const addTodo = async (page: Page, title: string, notes = ""): Promise<void> => {
  await page.getByLabel("Title", { exact: true }).fill(title)
  await page.getByLabel("Notes", { exact: true }).fill(notes)
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await expect(rowFor(page, title)).toBeVisible()
}

const waitForPatch = async (page: Page): Promise<void> => {
  const response = await page.waitForResponse(candidate => candidate.request().method() === "PATCH")
  expect(response.status()).toBe(200)
}

const activeCount = async (page: Page): Promise<number> =>
  Number(((await page.getByTestId("active-count").textContent()) ?? "").split(" ")[0])

test.describe("TODO app in a real browser", () => {
  test("loads the list from the API on open (AC-01)", async ({ page, createdTodoIds, request }) => {
    const title = uniqueTitle("Seeded through the API")
    const csrf = (await (await request.get("/api/csrf")).json()) as { token: string }
    const created = await request.post("/api/todos", { data: { title }, headers: { "x-csrf-token": csrf.token } })
    createdTodoIds.add(((await created.json()) as { id: string }).id)

    await page.goto("/")

    await expect(page.getByRole("heading", { name: "TODO" })).toBeVisible()
    await expect(rowFor(page, title)).toBeVisible()
  })

  test("shows the empty state when the filter matches nothing (AC-01)", async ({ page }) => {
    await page.route("**/api/todos", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }))

    await page.goto("/")

    await expect(page.getByText("Nothing to do yet. Add your first TODO above.")).toBeVisible()
  })

  test("adds a TODO with notes without reloading, and keeps Add disabled while the title is blank (AC-02)", async ({
    page,
    createdTodoIds
  }) => {
    const title = uniqueTitle("Buy stamps")
    await page.goto("/")
    const addButton = page.getByRole("button", { name: "Add", exact: true })
    await expect(addButton).toBeDisabled()
    await page.getByLabel("Title", { exact: true }).fill("    ")
    await expect(addButton).toBeDisabled()
    const navigations: string[] = []
    page.on("framenavigated", frame => navigations.push(frame.url()))

    await addTodo(page, title, "Forever stamps, two books")

    await expect(rowFor(page, title)).toContainText("Forever stamps, two books")
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("")
    expect(navigations).toEqual([])
    expect(createdTodoIds.size).toBe(1)
  })

  test("completes and reopens a TODO, and the change survives a reload (AC-03)", async ({ page, createdTodoIds }) => {
    const title = uniqueTitle("Water the ferns")
    await page.goto("/")
    await addTodo(page, title)
    const checkbox = page.getByLabel(`Mark ${title} complete`)

    await Promise.all([waitForPatch(page), checkbox.click()])
    await expect(checkbox).toBeChecked()
    await expect(rowFor(page, title).getByText(title)).toHaveClass(/line-through/)
    await page.reload()
    await expect(page.getByLabel(`Mark ${title} complete`)).toBeChecked()

    await Promise.all([waitForPatch(page), page.getByLabel(`Mark ${title} complete`).click()])
    await page.reload()
    await expect(page.getByLabel(`Mark ${title} complete`)).not.toBeChecked()
    await expect(rowFor(page, title).getByText(title)).not.toHaveClass(/line-through/)
    expect(createdTodoIds.size).toBe(1)
  })

  test("edits a TODO with Save, and discards edits with Cancel and with Escape (AC-04)", async ({ page }) => {
    const title = uniqueTitle("Draft report")
    const renamed = uniqueTitle("Final report")
    await page.goto("/")
    await addTodo(page, title)

    await page.getByLabel(`Edit ${title}`).click()
    await page.getByLabel("Edit title").fill("Should be discarded")
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(rowFor(page, title)).toBeVisible()

    await page.getByLabel(`Edit ${title}`).click()
    await page.getByLabel("Edit title").fill("Also discarded")
    await page.keyboard.press("Escape")
    await expect(rowFor(page, title)).toBeVisible()
    await expect(page.getByText("Also discarded")).toHaveCount(0)

    await page.getByLabel(`Edit ${title}`).click()
    await page.getByLabel("Edit title").fill(renamed)
    await page.getByLabel("Edit notes").fill("Send to Priya by Friday")
    await Promise.all([waitForPatch(page), page.getByRole("button", { name: "Save" }).click()])
    await page.reload()
    await expect(rowFor(page, renamed)).toContainText("Send to Priya by Friday")
    await expect(rowFor(page, title)).toHaveCount(0)
  })

  test("deletes a TODO once the API confirms, and it stays gone after reload (AC-05)", async ({ page }) => {
    const title = uniqueTitle("Cancel gym trial")
    await page.goto("/")
    await addTodo(page, title)
    const deleteResponse = page.waitForResponse(response => response.request().method() === "DELETE")

    await page.getByLabel(`Delete ${title}`).click()

    expect((await deleteResponse).status()).toBe(204)
    await expect(rowFor(page, title)).toHaveCount(0)
    await page.reload()
    await expect(rowFor(page, title)).toHaveCount(0)
  })

  test("filters by All, Active, and Completed, and counts the active items (AC-06)", async ({ page }) => {
    const done = uniqueTitle("Filed taxes")
    const open = uniqueTitle("Call plumber")
    await page.goto("/")
    await addTodo(page, done)
    await addTodo(page, open)
    const countBefore = await activeCount(page)
    await page.getByLabel(`Mark ${done} complete`).click()
    await expect.poll(() => activeCount(page)).toBe(countBefore - 1)

    await page.getByRole("link", { name: "Active" }).click()
    await expect(page).toHaveURL(/filter=active/)
    await expect(rowFor(page, open)).toBeVisible()
    await expect(rowFor(page, done)).toHaveCount(0)

    await page.getByRole("link", { name: "Completed" }).click()
    await expect(rowFor(page, done)).toBeVisible()
    await expect(rowFor(page, open)).toHaveCount(0)

    await page.getByRole("link", { name: "All" }).click()
    await expect(rowFor(page, done)).toBeVisible()
    await expect(rowFor(page, open)).toBeVisible()
  })

  test("shows a readable error when the API fails (AC-07)", async ({ page }) => {
    await page.goto("/")
    await page.route("**/api/todos", route => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.fallback()))

    await page.getByLabel("Title", { exact: true }).fill(uniqueTitle("Never saved"))
    await page.getByRole("button", { name: "Add", exact: true }).click()

    await expect(page.getByRole("alert")).toContainText("Can't reach the server")
    await page.getByLabel("Dismiss error").click()
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  test("shows a not-found message when editing a TODO that was deleted elsewhere (AC-07)", async ({ page, request }) => {
    const title = uniqueTitle("Deleted in another tab")
    await page.goto("/")
    await addTodo(page, title)
    const listed = (await (await request.get("/api/todos")).json()) as { id: string; title: string }[]
    const id = listed.find(todo => todo.title === title)?.id ?? ""
    const csrf = (await (await request.get("/api/csrf")).json()) as { token: string }
    await request.delete(`/api/todos/${id}`, { headers: { "x-csrf-token": csrf.token } })

    await page.getByLabel(`Mark ${title} complete`).click()

    await expect(page.getByRole("alert")).toContainText("That TODO no longer exists")
    await expect(rowFor(page, title)).toHaveCount(0)
  })
})
