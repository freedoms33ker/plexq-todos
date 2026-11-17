import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { CsrfRejected, csrfCookieName, csrfHeaderName } from "@todo/contract"
import { Effect, Schema } from "effect"
import { csrfTokensMatch, requiresCsrfToken } from "./csrf.ts"

export const csrfProtection = HttpMiddleware.make(app =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    if (isMissingValidToken(request)) {
      return yield* rejectRequest(request)
    } else {
      return yield* app
    }
  })
)

const isMissingValidToken = (request: HttpServerRequest.HttpServerRequest): boolean =>
  requiresCsrfToken(request.method) && !csrfTokensMatch(request.cookies[csrfCookieName], request.headers[csrfHeaderName])

const rejectRequest = (request: HttpServerRequest.HttpServerRequest): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Schema.encode(CsrfRejected)(new CsrfRejected({ message: "Missing or invalid CSRF token" })).pipe(
    Effect.orDie,
    Effect.map(body => HttpServerResponse.unsafeJson(body, { status: 403 })),
    Effect.tap(
      Effect.logWarning("Rejected request without a valid CSRF token").pipe(
        Effect.annotateLogs({ method: request.method, url: request.url })
      )
    )
  )
