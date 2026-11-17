import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { LoggerLive } from "../../common/logger.ts"
import { AppConfig } from "../../config/app-config.ts"
import { DatabaseLive } from "./database.ts"
import { runMigrations } from "./migrator.ts"

const reportMigrations = (applied: ReadonlyArray<readonly [number, string]>): Effect.Effect<void> =>
  applied.length === 0
    ? Effect.logInfo("Database schema is up to date; no migrations applied")
    : Effect.logInfo("Applied migrations").pipe(Effect.annotateLogs({ migrations: applied.map(([id, name]) => `${id}_${name}`).join(",") }))

const MigrationLive = Layer.mergeAll(DatabaseLive, LoggerLive, NodeContext.layer).pipe(Layer.provide(AppConfig.fromEnvironment))

runMigrations.pipe(Effect.flatMap(reportMigrations), Effect.provide(MigrationLive), effect =>
  NodeRuntime.runMain(effect, { disablePrettyLogger: true })
)
