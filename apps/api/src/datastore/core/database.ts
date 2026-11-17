import { PgClient } from "@effect/sql-pg"
import { Effect, Layer } from "effect"
import { AppConfig } from "../../config/app-config.ts"

export const DatabaseLive = Layer.unwrapEffect(
  Effect.map(AppConfig, config => PgClient.layer({ url: config.databaseUrl, applicationName: "todo-api" }))
)
