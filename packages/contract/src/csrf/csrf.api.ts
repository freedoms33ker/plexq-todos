import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

export const csrfCookieName = "csrf_token"
export const csrfHeaderName = "x-csrf-token"

export class CsrfToken extends Schema.Class<CsrfToken>("CsrfToken")({ token: Schema.String }) {}

export class CsrfRejected extends Schema.TaggedError<CsrfRejected>()(
  "CsrfRejected",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 403 })
) {}

export class CsrfApiGroup extends HttpApiGroup.make("csrf").add(HttpApiEndpoint.get("issueCsrfToken", "/csrf").addSuccess(CsrfToken)) {}
