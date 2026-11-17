import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { enTranslation } from "./i18n.ts"
import { todoFilters } from "./todos/lib/todo-filters.ts"

// Guards AC-08: every user-facing string goes through i18next, and every key used exists.
// api-client.ts touches `window`, so the failure kinds are read from its source rather than imported.
const sourceRoot = import.meta.dirname
const tsxFiles = readdirSync(sourceRoot, { recursive: true, encoding: "utf8" }).filter(file => file.endsWith(".tsx"))
const sources = tsxFiles.map(file => ({ file, text: readFileSync(join(sourceRoot, file), "utf8") }))
const apiFailureKinds = [
  ...(readFileSync(join(sourceRoot, "common/lib/api-client.ts"), "utf8").match(/apiFailureKinds = \[([^\]]+)\]/)?.[1] ?? "").matchAll(
    /"(\w+)"/g
  )
].map(m => m[1] ?? "")

const templateExpansions: Record<string, ReadonlyArray<string>> = {
  filter: todoFilters,
  "todos.error.kind": apiFailureKinds,
  "latest.kind": apiFailureKinds
}

const expandKey = (key: string): ReadonlyArray<string> => {
  const placeholder = key.match(/\$\{([^}]+)\}/)
  return placeholder === null ? [key] : (templateExpansions[placeholder[1] ?? ""] ?? []).map(value => key.replace(placeholder[0], value))
}

const usedKeys = sources.flatMap(({ text }) => [...text.matchAll(/\bt\(\s*[`"]([^`"]+)[`"]/g)].flatMap(match => expandKey(match[1] ?? "")))
const ternaryKeys = sources.flatMap(({ text }) =>
  [...text.matchAll(/t\([^)]*\?\s*"([^"]+)"\s*:\s*`([^`]+)`/g)].flatMap(match => [match[1] ?? "", ...expandKey(match[2] ?? "")])
)

const flattenKeys = (value: object, prefix = ""): ReadonlyArray<string> =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  )

const definedKeys = new Set(flattenKeys(enTranslation).map(key => key.replace(/_(one|other)$/, "")))

describe("i18n coverage", () => {
  it("finds the components and keys it is meant to check", () => {
    expect(tsxFiles.length).toBeGreaterThan(5)
    expect(usedKeys.length).toBeGreaterThan(20)
    expect(apiFailureKinds).toEqual(["notFound", "csrf", "validation", "network", "unexpected"])
  })

  it("defines every translation key the components use", () => {
    expect([...usedKeys, ...ternaryKeys].filter(key => !definedKeys.has(key))).toEqual([])
  })

  it("has no hard-coded aria-label, placeholder, or title attributes", () => {
    expect(sources.filter(({ text }) => /\b(aria-label|placeholder|title)="[^"]/.test(text)).map(({ file }) => file)).toEqual([])
  })

  it("has no hard-coded text between JSX tags", () => {
    expect(sources.filter(({ text }) => /(?<!=)>\s*[A-Za-z][^<>{}]*</.test(text)).map(({ file }) => file)).toEqual([])
  })

  it("gives every icon-only button an aria-label", () => {
    const iconButtons = sources.flatMap(({ text }) => [...text.matchAll(/<Button[^>]*size="icon"[^>]*>/g)].map(match => match[0]))
    expect(iconButtons.length).toBeGreaterThan(0)
    expect(iconButtons.filter(button => !button.includes("aria-label="))).toEqual([])
  })
})
