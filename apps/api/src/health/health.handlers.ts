import { HttpApiBuilder } from "@effect/platform"
import { HealthStatus, TodoAppApi } from "@todo/contract"
import { Effect } from "effect"

export const HealthHandlersLive = HttpApiBuilder.group(TodoAppApi, "health", handlers =>
  Effect.succeed(handlers.handle("health", () => Effect.succeed(HealthStatus.make({ status: "ok" }))))
)
