import { describe, expect, it } from "vitest"
import { csrfTokensMatch, generateCsrfToken, isWellFormedCsrfToken, requiresCsrfToken } from "./csrf.ts"

describe("requiresCsrfToken", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE", "post"])("requires a token for %s", method => {
    expect(requiresCsrfToken(method)).toBe(true)
  })

  it.each(["GET", "HEAD", "OPTIONS"])("does not require a token for %s", method => {
    expect(requiresCsrfToken(method)).toBe(false)
  })
})

describe("csrfTokensMatch", () => {
  const token = generateCsrfToken()

  it("accepts identical well-formed tokens", () => {
    expect(isWellFormedCsrfToken(token)).toBe(true)
    expect(csrfTokensMatch(token, token)).toBe(true)
  })

  it.each([
    ["a missing cookie", undefined, token],
    ["a missing header", token, undefined],
    ["different tokens", token, generateCsrfToken()],
    ["a malformed pair", "abc", "abc"],
    ["empty strings", "", ""]
  ])("rejects %s", (_label, cookie, header) => {
    expect(csrfTokensMatch(cookie, header)).toBe(false)
  })
})
