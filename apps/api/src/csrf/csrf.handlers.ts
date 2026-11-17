import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { CsrfToken, csrfCookieName, TodoAppApi } from "@todo/contract"
import { Effect, Schema } from "effect"
import { AppConfig } from "../config/app-config.ts"
import { generateCsrfToken, isWellFormedCsrfToken } from "./csrf.ts"

export const CsrfHandlersLive = HttpApiBuilder.group(TodoAppApi, "csrf", handlers =>
  Effect.gen(function* () {
    const config = yield* AppConfig
    return handlers.handleRaw("issueCsrfToken", () =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const token = currentOrNewToken(request.cookies[csrfCookieName])
        const body = yield* Schema.encode(CsrfToken)(CsrfToken.make({ token })).pipe(Effect.orDie)
        return HttpServerResponse.unsafeJson(body).pipe(
          HttpServerResponse.unsafeSetCookie(csrfCookieName, token, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: config.env !== "local"
          })
        )
      })
    )
  })
)

const currentOrNewToken = (existing: string | undefined): string => (isWellFormedCsrfToken(existing) ? existing : generateCsrfToken())
