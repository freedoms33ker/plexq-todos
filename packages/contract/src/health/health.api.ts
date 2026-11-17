import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

export class HealthStatus extends Schema.Class<HealthStatus>("HealthStatus")({ status: Schema.Literal("ok") }) {}

export class HealthApiGroup extends HttpApiGroup.make("health").add(HttpApiEndpoint.get("health", "/health").addSuccess(HealthStatus)) {}
