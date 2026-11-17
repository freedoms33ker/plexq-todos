import { HttpApiSchema } from "@effect/platform"
import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { CsrfRejected } from "../csrf/csrf.api.ts"
import { CreateTodoRequest, TodoNotFound, todoTitleMaxLength, UpdateTodoRequest } from "./todo.model.ts"

const decodeCreate = Schema.decodeUnknownEither(CreateTodoRequest)
const decodeUpdate = Schema.decodeUnknownEither(UpdateTodoRequest)

describe("CreateTodoRequest", () => {
  it("trims the title and defaults notes to null", () => {
    expect(Either.getOrThrow(decodeCreate({ title: "  Walk dog  " }))).toMatchObject({ title: "Walk dog", notes: null })
  })

  it("accepts a title of exactly the maximum length", () => {
    expect(Either.isRight(decodeCreate({ title: "a".repeat(todoTitleMaxLength) }))).toBe(true)
  })

  it.each([{}, { title: "" }, { title: "   " }, { title: "a".repeat(todoTitleMaxLength + 1) }, { title: 7 }])("rejects %j", body => {
    expect(Either.isLeft(decodeCreate(body))).toBe(true)
  })
})

describe("UpdateTodoRequest", () => {
  it("allows every field to be omitted and keeps an explicit null for notes", () => {
    expect(Either.getOrThrow(decodeUpdate({}))).toEqual(UpdateTodoRequest.make({}))
    expect(Either.getOrThrow(decodeUpdate({ notes: null })).notes).toBeNull()
  })

  it("applies the same title rules as create", () => {
    expect(Either.getOrThrow(decodeUpdate({ title: " Renamed " })).title).toBe("Renamed")
    expect(Either.isLeft(decodeUpdate({ title: " " }))).toBe(true)
  })
})

describe("error status codes", () => {
  it("maps TodoNotFound to 404 and CsrfRejected to 403", () => {
    expect(HttpApiSchema.getStatusError(TodoNotFound)).toBe(404)
    expect(HttpApiSchema.getStatusError(CsrfRejected)).toBe(403)
  })
})
