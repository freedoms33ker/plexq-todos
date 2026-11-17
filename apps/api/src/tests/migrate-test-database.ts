import { NodeContext } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { AppConfig } from "../config/app-config.ts"
import { DatabaseLive } from "../datastore/core/database.ts"
import { runMigrations } from "../datastore/core/migrator.ts"

const MigrationLive = Layer.mergeAll(DatabaseLive, NodeContext.layer).pipe(Layer.provide(AppConfig.fromEnvironment))

export default async (): Promise<void> => {
  await Effect.runPromise(runMigrations.pipe(Effect.asVoid, Effect.provide(MigrationLive)))
}
